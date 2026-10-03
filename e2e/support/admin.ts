import { randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { db } from "./checkout";

// Temporary admin accounts for the admin tests: random password, an
// @erayah.test address, deleted again afterwards.

export type TestUser = { userId: string; email: string; password: string };

export async function createTestUser(role: "owner" | "staff" | null): Promise<TestUser> {
  const email = `e2e-admin-${randomBytes(4).toString("hex")}@erayah.test`;
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (role) {
    const { error: e } = await db.from("admin_users").insert({ user_id: data.user.id, email, role });
    if (e) throw e;
  }
  return { userId: data.user.id, email, password };
}

export async function deleteTestUser(user: TestUser | undefined) {
  if (!user) return;
  await db.from("admin_users").delete().eq("user_id", user.userId);
  await db.auth.admin.deleteUser(user.userId);
}

export async function signIn(page: Page, user: TestUser, next = "/admin") {
  await page.goto(`/admin/login${next === "/admin" ? "" : `?next=${encodeURIComponent(next)}`}`);
  await page.locator("html[data-hydrated]").waitFor();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`));
}

/**
 * A paid test order made the way checkout makes one (create_order, then
 * confirm_payment), for one piece of a product in stock.
 */
export async function createPaidTestOrder(opts: { isGift?: boolean; giftNote?: string; /** Different per parallel project, so stock counts don't collide. */ slot?: number } = {}) {
  const { data: product } = await db
    .from("products")
    .select("id, slug, name, stock_qty, product_variants(id)")
    .eq("is_published", true)
    .gte("stock_qty", 3)
    // From the far end of the catalogue, so it doesn't share stock with the checkout tests.
    .order("id", { ascending: false })
    .limit(20);
  const pick = product!.filter((p) => !p.product_variants.length)[opts.slot ?? 0];
  const key = `e2e-admin-${randomBytes(8).toString("hex")}`;
  const { data: order, error } = await db.rpc("create_order", {
    payload: {
      idempotency_key: key,
      items: [{ product_id: pick.id, quantity: 1 }],
      customer: { name: "Meera Test", email: `e2e-${randomBytes(4).toString("hex")}@erayah.test`, phone: "9876543210" },
      address: { line1: "7 Lake Road", line2: null, landmark: "Near the temple", city: "Pune", state: "Maharashtra", pincode: "411001" },
      is_gift: opts.isGift ?? false,
      gift_note: opts.giftNote ?? null,
    } as never,
  });
  if (error) throw error;
  const o = order as unknown as { order_id: string; order_number: string; total: number };
  const rzp = `order_e2eadmin${randomBytes(5).toString("hex")}`;
  await db.from("orders").update({ razorpay_order_id: rzp }).eq("id", o.order_id);
  const { error: e2 } = await db.rpc("confirm_payment", { p_razorpay_order_id: rzp, p_payment_id: `pay_e2e${randomBytes(5).toString("hex")}`, p_signature: null as never, p_amount: o.total, p_source: "e2e" });
  if (e2) throw e2;
  return { id: o.order_id, number: o.order_number, productId: pick.id, productName: pick.name, stockBefore: pick.stock_qty };
}

/** Cancels a test order and puts its stock back (safe if already done). */
export async function releaseTestOrder(orderId: string) {
  await db.from("orders").update({ status: "cancelled", internal_notes: "E2E test order" }).eq("id", orderId);
  await db.rpc("restore_stock", { p_order_id: orderId });
}
