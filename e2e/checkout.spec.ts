import { expect, test, type Page } from "@playwright/test";

import {
  cleanUpTestOrders,
  db,
  fakeRazorpay,
  fillCheckout,
  makeGiftCard,
  MOCK_RAZORPAY,
  newPaymentId,
  productInStock,
  seedCart,
  sendWebhook,
} from "./support/checkout";

// Checkout against the real database with a fake Razorpay (see
// e2e/support). Opt-in: E2E_CHECKOUT=1 pnpm test:e2e e2e/checkout.spec.ts
// Needs migrations up to 20261003001300 applied. Creates orders marked
// @erayah.test and puts stock back afterwards.

const PAYMENT_FAILED = "Payment didn't go through. Your cart is safe, please try again.";

test.skip(!process.env.E2E_CHECKOUT, "set E2E_CHECKOUT=1 to run checkout tests (they write test orders)");

// One project places orders, so stock checks don't race between browsers.
const ordersProject = (name: string) => name === "chromium-1280";

test.afterAll(async () => {
  await cleanUpTestOrders();
});

async function openCheckout(page: Page, lines: Parameters<typeof seedCart>[1], gift?: Parameters<typeof seedCart>[2]) {
  await fakeRazorpay(page);
  await seedCart(page, lines, gift);
  await page.goto("/checkout");
  await page.locator("html[data-hydrated]").waitFor();
}

const placeOrder = (page: Page) => page.getByRole("button", { name: /Place order/ }).click();
const razorpay = (page: Page) => page.getByRole("dialog", { name: "Razorpay" });

test.describe("checkout form", () => {
  test("validates, autofills from the pincode and prices on the server", async ({ page }) => {
    const product = await productInStock();
    await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }], { giftNote: "Happy birthday!" });

    await expect(page.locator("#gift-note")).toHaveValue("Happy birthday!");
    await placeOrder(page);
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByText("Please enter a 6-digit pincode.")).toBeVisible();

    await page.getByLabel("Pincode").fill("400001");
    await expect(page.getByLabel("City")).toHaveValue("Mumbai");
    await expect(page.getByLabel("State")).toHaveValue("Maharashtra");

    // Total = price + ₹100 shipping, from the database.
    const total = new Intl.NumberFormat("en-IN").format((product.price + 10000) / 100);
    if (await page.getByText("Show order summary").isVisible()) await page.getByText("Show order summary").click();
    await expect(page.locator("[data-testid$=-total]:visible")).toHaveText(`₹${total}`);
    await expect(page.getByRole("button", { name: /Place order/ })).toContainText(`₹${total}`);
  });

  test("an expired gift card is refused", async ({ page }, testInfo) => {
    test.skip(!ordersProject(testInfo.project.name), "runs in one project");
    const product = await productInStock();
    const code = await makeGiftCard(50_000, true);
    await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }]);
    await page.locator("#desktop-gift-card").fill(code);
    await page.getByRole("button", { name: "Apply" }).last().click();
    await expect(page.getByText("This gift card isn't valid or has no balance left.").last()).toBeVisible();
  });
});

test.describe("checkout payments", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, testInfo) => test.skip(!ordersProject(testInfo.project.name), "orders are placed from one project"));

  for (const method of ["UPI", "card"]) {
    test(`${method} payment succeeds and shows the bill`, async ({ page }) => {
      const product = await productInStock();
      const before = product.stock_qty;
      await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }], { isGift: true, giftNote: "For you" });
      await fillCheckout(page);
      await placeOrder(page);

      await expect(razorpay(page)).toBeVisible();
      const opened = await page.evaluate(() => (window as unknown as { __rzpLast: { amount: number; theme: { color: string } } }).__rzpLast);
      expect(opened.amount).toBe(product.price + 10000);
      expect(opened.theme.color).toBe("#311829");
      await razorpay(page).getByRole("button", { name: `Pay with ${method}` }).click();

      await expect(page).toHaveURL(/\/order\/ERY-\d{4}-\d{5,}\?t=[0-9a-f]{64}$/);
      await expect(page.getByRole("heading", { name: "Thank you, Asha" })).toBeVisible();
      await expect(page.getByText(product.name)).toBeVisible();
      await expect(page.getByText("This is your bill. Please download or screenshot it for your records.")).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

      // Invoice PDF through the token-checked route.
      const href = await page.getByRole("link", { name: "Download invoice (PDF)" }).getAttribute("href");
      const pdf = await page.request.get(href!);
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toBe("application/pdf");
      expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
      const forged = await page.request.get(href!.replace(/t=[0-9a-f]{4}/, "t=0000"));
      expect(forged.status()).toBe(404);

      // Cart cleared, stock taken once.
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("erayah-cart")!).state.lines)).toEqual([]);
      const { data } = await db.from("products").select("stock_qty").eq("id", product.id).single();
      expect(data!.stock_qty).toBe(before - 1);
    });
  }

  test("a failed card, then closing, keeps the cart; retry reuses the order", async ({ page, baseURL }) => {
    const product = await productInStock();
    await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }]);
    await fillCheckout(page);
    await placeOrder(page);

    await razorpay(page).getByRole("button", { name: "Fail card" }).click();
    const { order_id: rzpOrderId, amount } = await page.evaluate(() => (window as unknown as { __rzpLast: { order_id: string; amount: number } }).__rzpLast);
    const failed = await sendWebhook(baseURL!, "payment.failed", { id: newPaymentId(), order_id: rzpOrderId, amount });
    expect(failed.status).toBe(200);
    await razorpay(page).getByRole("button", { name: "Close" }).click();

    await expect(page.getByRole("alert").filter({ hasText: PAYMENT_FAILED })).toBeVisible();
    await expect(page.getByRole("button", { name: /Place order/ })).toBeEnabled();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("erayah-cart")!).state.lines.length)).toBe(1);

    const { data: order } = await db.from("orders").select("id, payment_status, status").eq("razorpay_order_id", rzpOrderId).single();
    expect(order).toMatchObject({ payment_status: "failed", status: "pending_payment" });

    // Try again: same pending order, same Razorpay order.
    await placeOrder(page);
    await expect(razorpay(page)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __rzpLast: { order_id: string } }).__rzpLast.order_id)).toBe(rzpOrderId);
    await razorpay(page).getByRole("button", { name: "Pay with card" }).click();
    await expect(page.getByRole("heading", { name: "Thank you, Asha" })).toBeVisible();
    const created = (await (await fetch(`${MOCK_RAZORPAY}/__orders`)).json()) as { notes: { order_id: string } }[];
    expect(created.filter((o) => o.notes.order_id === order!.id)).toHaveLength(1);
  });

  test("closing the payment window keeps the cart", async ({ page }) => {
    const product = await productInStock();
    await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 2 }]);
    await fillCheckout(page);
    await placeOrder(page);
    await razorpay(page).getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("alert").filter({ hasText: PAYMENT_FAILED })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Asha Rao");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("erayah-cart")!).state.lines[0].quantity)).toBe(2);
  });

  test("a gift card pays part, Razorpay the rest", async ({ page }) => {
    const product = await productInStock();
    const code = await makeGiftCard(100_000);
    await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }]);
    await fillCheckout(page);
    await page.locator("#desktop-gift-card").fill(code.toLowerCase());
    await page.getByRole("button", { name: "Apply" }).last().click();
    await expect(page.getByText(`Gift card ${code} applied`).last()).toBeVisible();
    const due = product.price + 10000 - 100_000;
    await expect(page.getByTestId("desktop-total")).toHaveText(`₹${new Intl.NumberFormat("en-IN").format(due / 100)}`);

    await placeOrder(page);
    expect(await page.evaluate(() => (window as unknown as { __rzpLast: { amount: number } }).__rzpLast.amount)).toBe(due);
    await razorpay(page).getByRole("button", { name: "Pay with UPI" }).click();
    await expect(page.getByText(`Paid by gift card ${code}`)).toBeVisible();
    const { data: card } = await db.from("gift_cards").select("balance").eq("code", code).single();
    expect(card!.balance).toBe(0);
  });

  test("the last piece, bought from two browsers at once: one wins", async ({ browser }) => {
    const product = await productInStock(1);
    await db.from("products").update({ stock_qty: 1 }).eq("id", product.id);
    try {
      const pages = await Promise.all([browser.newPage(), browser.newPage()]);
      for (const page of pages) {
        await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }]);
        await fillCheckout(page);
      }
      await Promise.all(pages.map(placeOrder));
      const outcomes = await Promise.all(
        pages.map((page) =>
          Promise.race([
            razorpay(page).waitFor().then(() => "paying"),
            page.getByText("Sorry, one of your pieces has just sold out.").first().waitFor().then(() => "sold out"),
          ]),
        ),
      );
      expect(outcomes.sort()).toEqual(["paying", "sold out"]);
      const loser = pages[outcomes.indexOf("sold out")];
      await expect(loser.getByRole("button", { name: "Remove it" }).first()).toBeVisible();
      await Promise.all(pages.map((p) => p.close()));
    } finally {
      // Back to the original stock once the winner's hold is released (afterAll).
      await cleanUpTestOrders();
      await db.from("products").update({ stock_qty: product.stock_qty }).eq("id", product.id);
    }
  });

  test("the webhook arriving before /verify places the order once", async ({ page, baseURL }) => {
    const product = await productInStock();
    await openCheckout(page, [{ productId: product.id, slug: product.slug, quantity: 1 }]);
    await fillCheckout(page);
    await placeOrder(page);
    await expect(razorpay(page)).toBeVisible();

    const { order_id: rzpOrderId, amount } = await page.evaluate(() => (window as unknown as { __rzpLast: { order_id: string; amount: number } }).__rzpLast);
    const paymentId = newPaymentId();
    const hook = await sendWebhook(baseURL!, "payment.captured", { id: paymentId, order_id: rzpOrderId, amount });
    expect(hook.status).toBe(200);
    // A repeat delivery changes nothing.
    expect((await sendWebhook(baseURL!, "order.paid", { id: paymentId, order_id: rzpOrderId, amount })).status).toBe(200);

    await page.evaluate((id) => ((window as unknown as { __rzpNextPaymentId: string }).__rzpNextPaymentId = id), paymentId);
    await razorpay(page).getByRole("button", { name: "Pay with UPI" }).click();
    await expect(page.getByRole("heading", { name: "Thank you, Asha" })).toBeVisible();

    const { data: order } = await db.from("orders").select("id, status, payment_status, invoice_number").eq("razorpay_order_id", rzpOrderId).single();
    expect(order).toMatchObject({ status: "placed", payment_status: "paid" });
    expect(order!.invoice_number).toMatch(/^ERY\/\d{2}-\d{2}\/\d{5}$/);
    const { count } = await db
      .from("order_events")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order!.id)
      .eq("to_value", "placed");
    expect(count).toBe(1);
  });
});
