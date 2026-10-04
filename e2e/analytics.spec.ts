import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/admin";
import { db } from "./support/checkout";

// /admin/analytics. The signed-out checks always run. The rest is opt-in
// (E2E_ADMIN=1) and expects seeded test orders:
//
//   pnpm seed:test-orders
//   E2E_ADMIN=1 pnpm test:e2e e2e/analytics.spec.ts
//   pnpm clear:test-orders
//
// It runs at 375px and 1280px (Chromium).

const IST = 330 * 60_000;
const DAY = 86_400_000;
const istToday = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * DAY).toISOString().slice(0, 10);
const rupees = (paise: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(paise / 100)}`;

/** Sales between two India dates, added up here in JavaScript (not by the SQL functions under test). */
async function byHand(from: string, to: string) {
  const start = new Date(Date.parse(from) - IST).toISOString();
  const end = new Date(Date.parse(to) + DAY - IST).toISOString();
  const { data } = await db.from("orders").select("total, status, payment_status").gte("paid_at", start).lt("paid_at", end).limit(5000);
  const sales = (data ?? []).filter((o) => o.payment_status === "paid" && !["cancelled", "pending_payment"].includes(o.status));
  const revenue = sales.reduce((n, o) => n + o.total, 0);
  return { revenue, orders: sales.length, aov: sales.length ? Math.round(revenue / sales.length) : 0 };
}

test.describe("analytics, signed out", () => {
  test("the page needs a sign-in and the functions refuse the public", async ({ page }) => {
    await page.goto("/admin/analytics");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fanalytics$/);
    const exported = await page.request.get("/admin/analytics/export?section=summary", { maxRedirects: 0 });
    expect([307, 401]).toContain(exported.status());

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    for (const [fn, args] of [
      ["analytics_summary", { p_from: "2026-01-01", p_to: "2026-12-31" }],
      ["analytics_repeat_customers", { p_from: "2026-01-01", p_to: "2026-12-31" }],
      ["analytics_sales", { p_from: "2026-01-01", p_to: "2026-12-31" }],
    ] as const) {
      const { data, error } = await anon.rpc(fn as never, args as never);
      expect(error?.code, `${fn} must be refused`).toBe("42501");
      expect(data).toBeNull();
    }
  });
});

test.describe("analytics", () => {
  test.skip(!process.env.E2E_ADMIN, "set E2E_ADMIN=1 and run pnpm seed:test-orders first");
  const runsHere = (name: string) => ["chromium-1280", "chromium-375"].includes(name);
  test.beforeEach(({}, info) => test.skip(!runsHere(info.project.name), "Chromium at 375px and 1280px"));

  let owner: TestUser;
  let staff: TestUser;
  let outsider: TestUser;

  test.beforeAll(async ({}, info) => {
    if (!runsHere(info.project.name)) return;
    const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("is_test", true);
    expect(count, "run `pnpm seed:test-orders` before these tests").toBeGreaterThan(100);
    [owner, staff, outsider] = await Promise.all([createTestUser("owner"), createTestUser("staff"), createTestUser(null)]);
  });
  test.afterAll(async () => {
    await Promise.all([deleteTestUser(owner), deleteTestUser(staff), deleteTestUser(outsider)]);
  });

  const open = async (page: Page, query: string) => {
    await page.goto(`/admin/analytics?${query}`);
    await expect(page.getByRole("heading", { level: 1, name: "Analytics" })).toBeVisible();
  };

  test("loads, matches a by-hand total, and the date range changes the numbers", async ({ page }) => {
    const today = istToday();
    const last30 = await byHand(addDays(today, -29), today);
    const last7 = await byHand(addDays(today, -6), today);
    expect(last30.orders).toBeGreaterThan(last7.orders);

    await signIn(page, owner, "/admin/analytics?range=30d&test=1");
    await expect(page.getByRole("heading", { level: 1, name: "Analytics" })).toBeVisible();
    const ids: Record<string, string> = { "Total revenue": "kpi-revenue", Orders: "kpi-orders", "Average order value": "kpi-aov" };
    const card = (label: string) => page.getByTestId(ids[label]);
    // Other test files may pay for an order while this runs, so read both sides again until they agree.
    const agrees = (from: string, to: string) =>
      expect(async () => {
        const hand = await byHand(from, to);
        await page.reload();
        await expect(card("Total revenue")).toContainText(rupees(hand.revenue), { timeout: 4000 });
        await expect(card("Orders").locator("p").nth(1)).toHaveText(String(hand.orders), { timeout: 4000 });
        await expect(card("Average order value")).toContainText(rupees(hand.aov), { timeout: 4000 });
      }).toPass({ timeout: 45_000 });
    await agrees(addDays(today, -29), today);
    await expect(page.getByTestId("range-summary")).toContainText("(30 days)");

    // All ten sections, in order.
    const titles = await page.locator("main section h2").allTextContents();
    expect(titles).toEqual(["Sales over time", "Sales by category", "Best-selling products", "Low stock alerts", "Sales by location", "Gift card usage", "Repeat customers"]);
    await expect(page.locator(".recharts-wrapper")).toHaveCount(2);

    // No sideways scrolling of the page itself, at either width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    // A different range gives different numbers.
    await page.getByRole("link", { name: "Last 7 days" }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expect(page.getByTestId("range-summary")).toContainText("(7 days)");
    await agrees(addDays(today, -6), today);

    // Custom dates.
    const from = addDays(today, -59);
    await page.getByLabel("From").fill(from);
    await page.getByLabel("To", { exact: true }).fill(addDays(today, -30));
    await page.getByRole("button", { name: "Custom" }).click();
    await expect(page).toHaveURL(/range=custom/);
    await agrees(from, addDays(today, -30));

    // A period with nothing in it.
    await open(page, "range=custom&from=2025-01-01&to=2025-01-31&test=1");
    await expect(page.getByTestId("no-sales")).toContainText("No sales in this period yet");
    await expect(page.getByRole("heading", { name: "Low stock alerts" })).toBeVisible();
  });

  test("the chart reads out a day, and best sellers sort and expand", async ({ page }) => {
    await signIn(page, owner, "/admin/analytics?range=30d&test=1");
    const chart = page.locator(".recharts-wrapper").first();
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await expect(page.locator(".recharts-tooltip-wrapper").first()).toContainText(/₹[\d,]+/);
    await expect(page.locator(".recharts-tooltip-wrapper").first()).toContainText(/\d+ orders?/);

    const table = page.locator("section", { has: page.getByRole("heading", { name: "Best-selling products" }) });
    expect(await table.locator("tbody tr").count()).toBeLessThanOrEqual(20);
    const firstByUnits = await table.locator("tbody tr").first().innerText();
    await table.getByRole("button", { name: "Revenue" }).click();
    await expect(table.getByRole("button", { name: "Revenue" })).toHaveAttribute("aria-pressed", "true");
    const firstByRevenue = await table.locator("tbody tr").first().innerText();
    expect(firstByRevenue).not.toBe("");
    expect(firstByUnits).not.toBe("");
    const versions = table.getByRole("button", { name: /Show \d+ versions/ }).first();
    if (await versions.count()) {
      const before = await table.locator("tbody tr").count();
      await versions.click();
      expect(await table.locator("tbody tr").count()).toBeGreaterThan(before);
    }

    const location = page.locator("section", { has: page.getByRole("heading", { name: "Sales by location" }) });
    await expect(location.getByRole("columnheader", { name: "State" })).toBeVisible();
    await location.getByRole("button", { name: "Show cities" }).click();
    await expect(location.getByRole("columnheader", { name: "City" })).toBeVisible();
    await expect(location.getByText("Mumbai, Maharashtra").first()).toBeVisible();
  });

  test("CSV downloads work for every section", async ({ page }) => {
    await signIn(page, owner, "/admin/analytics?range=30d&test=1");
    const sections: [string, RegExp][] = [
      ["summary", /"Total revenue \(Rs\)"/],
      ["sales-over-time", /"Date","Revenue \(Rs\)","Orders"/],
      ["categories", /"Earrings"/],
      ["products", /"Rank","Design","Version","Units sold","Revenue \(Rs\)"/],
      ["low-stock", /"Product","Option","In stock"/],
      ["locations", /"Maharashtra"/],
      ["gift-cards", /"Value issued \(Rs\)"/],
      ["repeat-customers", /"Customer","Phone","Orders"/],
    ];
    for (const [section, expected] of sections) {
      const res = await page.request.get(`/admin/analytics/export?section=${section}&range=30d&test=1`);
      expect(res.status(), section).toBe(200);
      expect(res.headers()["content-type"]).toContain("text/csv");
      expect(res.headers()["content-disposition"]).toContain("attachment");
      expect(await res.text(), section).toMatch(expected);
    }
    const days = (await (await page.request.get("/admin/analytics/export?section=sales-over-time&range=30d&test=1")).text()).trim().split("\r\n");
    expect(days).toHaveLength(31); // header + 30 days

    // The button on the page downloads a file.
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download Sales by category as CSV" }).click();
    expect((await download).suggestedFilename()).toMatch(/^erayah-categories-.*\.csv$/);
  });

  test("repeat customers: phones masked on the page, full only in the owner's CSV", async ({ page }) => {
    await signIn(page, owner, "/admin/analytics?range=30d&test=1");
    const section = page.locator("section", { has: page.getByRole("heading", { name: "Repeat customers" }) });
    await expect(section.getByText(/^90XXXXX\d{3}$/).first()).toBeVisible();
    // Nowhere on the page, visible or in links, is a full test phone number.
    expect(await page.content()).not.toMatch(/90000\d{5}/);

    const csv = await (await page.request.get("/admin/analytics/export?section=repeat-customers&range=30d&test=1")).text();
    expect(csv).toMatch(/"90000\d{5}"/);

    // Each customer links to their orders, by order number rather than phone.
    await section.locator("tbody a").first().click();
    await expect(page).toHaveURL(/\/admin\/orders\?customer=TEST-2026-\d{5}$/);
    await expect(page.getByText(/Showing every order from the same customer as TEST-2026-\d{5}/)).toBeVisible();
  });

  test("staff can view analytics but not the customer list; outsiders can't open it", async ({ page, browser }) => {
    await signIn(page, staff, "/admin/analytics?range=30d&test=1");
    await expect(page.getByRole("heading", { name: "Repeat customers" })).toBeVisible();
    await expect(page.getByText("Only the owner can download this list.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download Repeat customers as CSV" })).toHaveCount(0);
    expect((await page.request.get("/admin/analytics/export?section=repeat-customers&range=30d&test=1")).status()).toBe(403);
    expect((await page.request.get("/admin/analytics/export?section=categories&range=30d&test=1")).status()).toBe(200);

    const other = await browser.newPage();
    await other.goto("/admin/login?next=%2Fadmin%2Fanalytics");
    await other.locator("html[data-hydrated]").waitFor();
    await other.getByLabel("Email").fill(outsider.email);
    await other.getByLabel("Password").fill(outsider.password);
    await other.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(other.getByText("No access. This account isn't an Erayah admin.")).toBeVisible();
    await other.goto("/admin/analytics");
    await expect(other).toHaveURL(/\/admin\/login/);
    await other.close();
  });

  test("low stock threshold is saved, and the dashboard links here", async ({ page }, info) => {
    test.skip(info.project.name !== "chromium-1280", "changes a setting, so one project only");
    await signIn(page, owner, "/admin/analytics?range=30d&test=1");
    const section = page.locator("section", { has: page.getByRole("heading", { name: "Low stock alerts" }) });
    const input = section.getByLabel("Alert when stock is at or below");
    const original = await input.inputValue();
    try {
      await input.fill("5");
      await section.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Low stock now means 5 or fewer.")).toBeVisible();
      await expect(section.locator("tbody tr").first()).toBeVisible();
      await expect(section.locator("tbody tr a").first()).toHaveAttribute("href", /\/admin\/products\/\d+$/);
      const { data } = await db.from("site_settings").select("low_stock_threshold").eq("id", 1).single();
      expect(data!.low_stock_threshold).toBe(5);
    } finally {
      await db.from("site_settings").update({ low_stock_threshold: Number(original) || 2 }).eq("id", 1);
    }

    await page.goto("/admin");
    const strip = page.getByRole("link", { name: "Last 30 days: open Analytics" });
    await expect(strip).toContainText("Revenue");
    await expect(strip).toContainText("Average order");
    await strip.click();
    await expect(page).toHaveURL(/\/admin\/analytics$/);
  });
});
