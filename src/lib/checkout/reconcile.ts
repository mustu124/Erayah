import "server-only";

import { after } from "next/server";

import { afterOrderPlaced } from "@/lib/invoice";
import { fetchOrderPayments } from "@/lib/razorpay/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

/**
 * The safety net under /verify and the webhook: ask Razorpay itself whether
 * an order's payment went through, and if it was captured, confirm the order
 * with the same database function they use (idempotent, amount-checked, so a
 * payment can never place an order twice or for the wrong sum).
 *
 *  placed      the order is paid (now or already)
 *  processing  Razorpay has a payment in progress (created / authorized), or couldn't be asked
 *  unpaid      no payment was taken
 */
export type PaymentCheck = "placed" | "processing" | "unpaid";

type OrderRef = Pick<Tables<"orders">, "id" | "order_number" | "razorpay_order_id" | "payment_status" | "status">;

// One look at Razorpay per order every few seconds per server, however often the page refreshes.
const lastAsked = new Map<string, number>();
const ASK_EVERY_MS = 2_500;

export async function reconcileOrder(order: OrderRef, source: string): Promise<PaymentCheck> {
  if (order.payment_status === "paid") return order.status === "cancelled" ? "unpaid" : "placed";
  if (!order.razorpay_order_id) return "unpaid";

  const now = Date.now();
  if (now - (lastAsked.get(order.id) ?? 0) < ASK_EVERY_MS) return "processing";
  lastAsked.set(order.id, now);

  let payments;
  try {
    payments = await fetchOrderPayments(order.razorpay_order_id);
  } catch (error) {
    console.error(`reconcile ${order.order_number}: Razorpay lookup failed:`, (error as Error).message);
    return "processing";
  }

  const captured = payments.find((p) => p.status === "captured");
  if (!captured) return payments.some((p) => p.status === "created" || p.status === "authorized") ? "processing" : "unpaid";

  const { data, error } = await createAdminClient().rpc("confirm_payment", {
    p_razorpay_order_id: order.razorpay_order_id,
    p_payment_id: captured.id,
    p_signature: null as unknown as string,
    p_amount: captured.amount,
    p_source: `reconcile (${source})`,
  });
  if (error) {
    console.error(`reconcile ${order.order_number}: confirm_payment failed:`, error.message);
    return "processing";
  }
  const result = data as unknown as { order_id: string; status: string; newly_placed: boolean; needs_refund: boolean };
  if (result.newly_placed) {
    console.info(`reconcile ${order.order_number}: payment ${captured.id} confirmed (${source})`);
    after(() => afterOrderPlaced(result.order_id));
  }
  if (result.needs_refund) console.error(`reconcile ${order.order_number}: paid after expiry and stock is gone, REFUND NEEDED`);
  return result.status === "placed" ? "placed" : "unpaid";
}

/**
 * Recent orders that may have been paid without either confirmation arriving:
 * still waiting, or expired as unpaid. Checked when the owner opens the
 * dashboard (in the background), so no paid order goes unnoticed for long.
 */
export async function reconcileRecentOrders(): Promise<void> {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("id, order_number, razorpay_order_id, payment_status, status")
    .not("razorpay_order_id", "is", null)
    .neq("payment_status", "paid")
    .in("status", ["pending_payment", "cancelled"])
    .eq("is_test", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("reconcile sweep:", error.message);
    return;
  }
  await Promise.all((data ?? []).map((o) => reconcileOrder(o, "admin sweep")));
}
