import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { createPaidTestOrder, createTestUser, deleteTestUser, releaseTestOrder, signIn, type TestUser } from "./support/admin";
import { db } from "./support/checkout";

// The admin panel against the real database. Signed-out checks always run;
// the rest is opt-in (E2E_ADMIN=1) because it creates throwaway admin
// accounts, test orders (@erayah.test) and a draft product, all removed or
// cancelled again afterwards. Runs in one desktop and one phone project.

const isMobile = (name: string) => name.endsWith("-375");

test.describe("admin, signed out", () => {
  test("every admin page sends you to sign in, and stays out of search engines", async ({ page }) => {
    const response = await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Forders$/);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    const robots = await (await page.request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
  });
});

test.describe("admin", () => {
  test.skip(!process.env.E2E_ADMIN, "set E2E_ADMIN=1 to run admin tests (they write test data)");
  test.describe.configure({ mode: "serial" });
  const runsHere = (name: string) => ["chromium-1280", "chromium-375"].includes(name);
  test.beforeEach(({}, info) => test.skip(!runsHere(info.project.name), "one desktop and one phone project"));

  let owner: TestUser;
  let staff: TestUser;
  let outsider: TestUser;
  const orders: string[] = [];
  let tempProductId: number | null = null;

  test.beforeAll(async ({}, info) => {
    if (!runsHere(info.project.name)) return;
    [owner, staff, outsider] = await Promise.all([createTestUser("owner"), createTestUser("staff"), createTestUser(null)]);
  });
  test.afterAll(async () => {
    for (const id of orders) await releaseTestOrder(id);
    if (tempProductId) await db.from("products").delete().eq("id", tempProductId);
    await Promise.all([deleteTestUser(owner), deleteTestUser(staff), deleteTestUser(outsider)]);
  });

  test("someone who isn't an admin gets No access", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("html[data-hydrated]").waitFor();
    await page.getByLabel("Email").fill(outsider.email);
    await page.getByLabel("Password").fill(outsider.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("No access. This account isn't an Erayah admin.")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("staff see orders and products, not settings", async ({ page }, info) => {
    await signIn(page, staff);
    if (isMobile(info.project.name)) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: "Admin" }).filter({ visible: true });
    await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Products" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\?denied=1$/);
    await expect(page.getByText("That page is for the owner only.")).toBeVisible();
  });

  test("a new paid order chimes in on the dashboard, then is handled end to end", async ({ page }, info) => {
    test.setTimeout(120_000);
    await signIn(page, owner);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Revenue this week")).toBeVisible();

    // Realtime: the "to confirm" badge goes up when an order is paid.
    if (isMobile(info.project.name)) await page.getByRole("button", { name: "Open menu" }).click();
    const badge = page.getByLabel(/new orders to confirm/).filter({ visible: true });
    const before = (await badge.count()) ? Number(await badge.textContent()) : 0;
    const order = await createPaidTestOrder({ isGift: true, giftNote: "Happy anniversary, Ma", slot: isMobile(info.project.name) ? 1 : 0 });
    orders.push(order.id);
    // At least one more (the other browser project may be adding its own test order).
    await expect.poll(async () => Number((await badge.textContent().catch(() => "0")) || 0), { timeout: 20_000 }).toBeGreaterThanOrEqual(before + 1);

    // Find it.
    await page.goto(`/admin/orders?q=${order.number}`);
    await page.getByRole("link", { name: order.number }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { name: order.number })).toBeVisible();
    await expect(page.getByText("“Happy anniversary, Ma”")).toBeVisible();
    await expect(page.getByRole("link", { name: "+91 9876543210" })).toHaveAttribute("href", "tel:+919876543210");
    await expect(page.getByRole("link", { name: /WhatsApp/ }).first()).toHaveAttribute("href", /wa\.me\/919876543210\?text=Hello%20Meera/);

    // Confirm, then record the courier.
    await page.getByLabel("Note (optional)").fill("Checked stock");
    await page.getByRole("button", { name: "Mark as confirmed" }).click();
    await expect(page.getByText("Marked confirmed.")).toBeVisible();
    await expect(page.getByText("Checked stock")).toBeVisible();
    await page.getByLabel("Courier").fill("Delhivery");
    await page.getByLabel("Tracking number").fill("DL123456");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Shipping details: courier Delhivery, tracking DL123456")).toBeVisible();

    // Packing slip: a gift, so no prices, and the note.
    const slip = await page.context().newPage();
    await slip.addInitScript(() => (window.print = () => {}));
    await slip.goto(`/admin/print/packing-slip/${order.number}`);
    await expect(slip.getByText("Packing slip")).toBeVisible();
    await expect(slip.getByText("Happy anniversary, Ma")).toBeVisible();
    await expect(slip.getByText("₹")).toHaveCount(0);
    await slip.close();

    // Invoice and CSV.
    const pdf = await page.request.get(`/admin/orders/${order.number}/invoice`);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    const csv = await page.request.get(`/admin/orders/export?q=${order.number}`);
    expect(await csv.text()).toContain(order.number);

    // Cancel: stock comes back (compared just before and after; other test runs may hold stock too).
    const stockOf = async () => (await db.from("products").select("stock_qty").eq("id", order.productId).single()).data!.stock_qty;
    const held = await stockOf();
    page.once("dialog", (d) => d.accept());
    await page.locator("fieldset label", { hasText: /^Cancelled$/ }).click();
    await page.getByRole("button", { name: "Mark as cancelled" }).click();
    await expect(page.getByText("Marked cancelled. The pieces are back in stock.")).toBeVisible();
    expect(await stockOf()).toBe(held + 1);
  });

  test("orders filter and stay usable on a phone", async ({ page }, info) => {
    await signIn(page, owner, "/admin/orders");
    await page.getByLabel("Status").selectOption("cancelled");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/status=cancelled/);
    if (isMobile(info.project.name)) {
      await expect(page.locator("table")).toBeHidden();
      await expect(page.locator("main ul li a").first()).toBeVisible();
    } else {
      await expect(page.getByRole("columnheader", { name: "Customer" })).toBeVisible();
    }
  });

  test("products: duplicate, edit, inline stock, photo upload, delete", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "editing runs on desktop");
    test.setTimeout(120_000);
    const { data: source } = await db.from("products").select("id, name").eq("slug", "meher-earrings").single();
    await signIn(page, owner, `/admin/products/${source!.id}`);
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByRole("heading", { name: `${source!.name} (copy)` })).toBeVisible();
    tempProductId = Number(page.url().split("/").pop());
    await expect(page.getByText("Draft (hidden from the shop)")).toBeVisible();

    await page.getByLabel("Name").fill("E2E Test Earrings");
    await page.getByLabel("Web address (slug)").fill(`e2e-test-earrings-${tempProductId}`);
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Product saved.")).toBeVisible();

    // A photo goes through resize → WebP → storage → database.
    const png = await sharp({ create: { width: 3000, height: 3750, channels: 3, background: "#c9a96e" } }).png().toBuffer();
    await page.locator('input[type="file"]').nth(2).setInputFiles({ name: "detail.png", mimeType: "image/png", buffer: png });
    await expect(page.getByText("Photo added.")).toBeVisible({ timeout: 30_000 });
    const { data: images } = await db.from("product_images").select("storage_path, width, height, blur_data_url, role").eq("product_id", tempProductId).order("id", { ascending: false }).limit(1);
    expect(images![0].width).toBe(1920);
    expect(images![0].height).toBe(2400);
    expect(images![0].storage_path).toMatch(/\.(webp|jpg)$/);
    expect(images![0].blur_data_url).toMatch(/^data:image\//);

    // Inline stock edit in the list.
    await page.goto(`/admin/products?q=E2E Test`);
    const stock = page.getByLabel("Stock of E2E Test Earrings").filter({ visible: true });
    await stock.fill("7");
    await stock.press("Enter");
    await expect(page.getByText("Stock saved.")).toBeVisible();
    const { data: saved } = await db.from("products").select("stock_qty").eq("id", tempProductId).single();
    expect(saved!.stock_qty).toBe(7);

    // Never ordered, so it can be deleted (with its new photo).
    await page.goto(`/admin/products/${tempProductId}`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("id", tempProductId);
    expect(count).toBe(0);
    tempProductId = null;
  });

  test("merchandising shows the customer grid with suggestions", async ({ page }) => {
    await signIn(page, owner, "/admin/merchandising");
    await expect(page.getByRole("heading", { name: "Merchandising" })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
    // Keyboard reorder marks the grid as changed (not saved, so the shop is untouched).
    const handle = page.getByRole("button", { name: /^Move / }).first();
    await expect(async () => {
      await handle.focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
      await expect(page.getByText("Unsaved changes")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  });

  test("gift cards, shipping test, content preview and settings", async ({ page }) => {
    await signIn(page, owner, "/admin/promotions");
    const code = `E2E${Date.now().toString(36).toUpperCase()}`;
    await page.getByLabel("Code").fill(code);
    await page.getByLabel("Amount (₹)").fill("1500");
    await page.getByRole("button", { name: "Create gift card" }).click();
    await expect(page.getByText(`Gift card ${code} created.`)).toBeVisible();
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    await db.from("gift_cards").update({ is_active: false }).eq("code", code);

    await page.goto("/admin/shipping");
    await page.getByLabel("Pincode").first().fill("400001");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("status")).toContainText("₹100 shipping");

    await page.goto("/admin/content/pages/about");
    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.locator(".prose-admin")).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByLabel("Legal business name")).toHaveValue(/.+/);
    await expect(page.getByText(`${owner.email} (you)`)).toBeVisible();
  });
});
