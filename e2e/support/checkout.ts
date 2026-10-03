import { createHmac, randomBytes } from "node:crypto";

import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Helpers for the checkout tests: database access (service role), Razorpay
// signatures, a fake checkout.js, and form filling. Test orders use an
// @erayah.test email so they can be found and cleaned up.

try {
  process.loadEnvFile(".env.local");
} catch {
  // CI provides the variables directly.
}

export const TEST_EMAIL_DOMAIN = "erayah.test";
export const MOCK_RAZORPAY = `http://localhost:${process.env.MOCK_RAZORPAY_PORT ?? 3199}`;

export const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const hmac = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex");
export const paymentSignature = (orderId: string, paymentId: string) =>
  hmac(process.env.RAZORPAY_KEY_SECRET!, `${orderId}|${paymentId}`);
export const newPaymentId = () => `pay_${randomBytes(7).toString("hex")}`;

/** Sends a signed webhook to the app, as Razorpay would. */
export async function sendWebhook(baseURL: string, event: string, payment: { id: string; order_id: string; amount: number }) {
  const body = JSON.stringify({
    entity: "event",
    event,
    payload: {
      payment: {
        entity: {
          ...payment,
          status: event === "payment.failed" ? "failed" : "captured",
          error_description: event === "payment.failed" ? "Card declined by bank" : null,
        },
      },
    },
  });
  return fetch(`${baseURL}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Razorpay-Signature": hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, body) },
    body,
  });
}

/**
 * Replaces checkout.js with a small stand-in: "Pay with UPI" / "Pay with card"
 * succeed (signed with the test key secret), "Fail card" reports a failure,
 * "Close" dismisses. window.__rzpLast holds the options it was opened with;
 * set window.__rzpNextPaymentId to choose the payment id.
 */
export async function fakeRazorpay(page: Page) {
  await page.exposeFunction("__rzpSign", (orderId: string, paymentId: string) => paymentSignature(orderId, paymentId));
  await page.route("https://checkout.razorpay.com/v1/checkout.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        window.Razorpay = function (opts) { this.opts = opts; this.handlers = {}; };
        window.Razorpay.prototype.on = function (ev, cb) { this.handlers[ev] = cb; };
        window.Razorpay.prototype.open = function () {
          var o = this.opts, self = this;
          window.__rzpLast = { order_id: o.order_id, amount: o.amount, key: o.key, prefill: o.prefill, theme: o.theme };
          var root = document.createElement("div");
          root.setAttribute("role", "dialog");
          root.setAttribute("aria-label", "Razorpay");
          root.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.5);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center";
          function close() { root.remove(); }
          function pay() {
            var pid = window.__rzpNextPaymentId || ("pay_" + Math.random().toString(36).slice(2, 16));
            window.__rzpNextPaymentId = null;
            window.__rzpSign(o.order_id, pid).then(function (sig) {
              close();
              o.handler({ razorpay_order_id: o.order_id, razorpay_payment_id: pid, razorpay_signature: sig });
            });
          }
          function button(label, fn) {
            var b = document.createElement("button");
            b.type = "button"; b.textContent = label; b.onclick = fn;
            b.style.cssText = "background:#fff;color:#000;padding:12px 16px";
            root.append(b);
          }
          button("Pay with UPI", pay);
          button("Pay with card", pay);
          button("Fail card", function () { self.handlers["payment.failed"] && self.handlers["payment.failed"]({ error: { description: "Card declined" } }); });
          button("Close", function () { close(); o.modal.ondismiss(); });
          document.body.append(root);
        };
      `,
    }),
  );
}

export type CartSeed = { productId: number; slug: string; variantLabel?: string | null; quantity: number };

export async function seedCart(page: Page, lines: CartSeed[], gift: { isGift?: boolean; giftNote?: string } = {}) {
  await page.goto("/");
  await page.evaluate(
    ([lines, gift]) =>
      localStorage.setItem(
        "erayah-cart",
        JSON.stringify({
          state: { lines: lines.map((l) => ({ variantLabel: null, ...l })), isGift: false, giftNote: "", ...gift },
          version: 2,
        }),
      ),
    [lines, gift] as const,
  );
}

export async function fillCheckout(page: Page, who = "Asha Rao") {
  const tag = randomBytes(4).toString("hex");
  await page.getByLabel("Email").fill(`e2e-${tag}@${TEST_EMAIL_DOMAIN}`);
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByLabel("Full name").fill(who);
  await page.getByLabel("Pincode").fill("400001");
  await page.getByLabel("House no., building, street").fill("12 Marine Drive");
  // Autofilled from the pincode.
  await page.waitForFunction(() => (document.getElementById("city") as HTMLInputElement | null)?.value === "Mumbai");
  await page.waitForFunction(() => (document.getElementById("state") as HTMLSelectElement | null)?.value === "Maharashtra");
}

/** A published product with at least `min` pieces in stock and no colour options. */
export async function productInStock(min = 3, exclude: number[] = []) {
  const { data, error } = await db
    .from("products")
    .select("id, slug, name, price, stock_qty, product_variants(id)")
    .eq("is_published", true)
    .not("price", "is", null)
    .gte("stock_qty", min)
    .order("id");
  if (error) throw error;
  const product = data.find((p) => !p.product_variants.length && !exclude.includes(p.id));
  if (!product) throw new Error("no product in stock for the test");
  return product as { id: number; slug: string; name: string; price: number; stock_qty: number };
}

export async function makeGiftCard(balance: number, expired = false) {
  const code = `E2E${randomBytes(4).toString("hex").toUpperCase()}`;
  const { error } = await db.from("gift_cards").insert({
    code,
    initial_balance: balance,
    balance,
    expires_at: expired ? new Date(Date.now() - 86_400_000).toISOString() : null,
    note: "E2E test card",
  });
  if (error) throw error;
  return code;
}

/**
 * Puts stock and gift card balances back for every test order and cancels
 * them (they're kept, marked, for the owner's pre-launch cleanup).
 */
export async function cleanUpTestOrders() {
  const { data: orders } = await db
    .from("orders")
    .select("id, status, stock_released_at")
    .like("email", `%@${TEST_EMAIL_DOMAIN}`)
    .is("stock_released_at", null);
  for (const order of orders ?? []) {
    if (order.status !== "cancelled") {
      await db.from("orders").update({ status: "cancelled", internal_notes: "E2E test order" }).eq("id", order.id);
    }
    const { error } = await db.rpc("restore_stock", { p_order_id: order.id });
    if (error) console.warn("restore_stock", order.id, error.message);
  }
  await db.from("gift_cards").update({ is_active: false }).like("code", "E2E%");
}
