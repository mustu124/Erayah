import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// Razorpay over plain fetch: create orders, read their payments, check signatures.
// Docs: https://razorpay.com/docs/payments/server-integration/nodejs/

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

export async function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${env.RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt, notes: input.notes }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
};

/** The payments made against one Razorpay order (Razorpay is the source of truth). */
export async function fetchOrderPayments(orderId: string): Promise<RazorpayPayment[]> {
  const auth = Buffer.from(`${env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`${env.RAZORPAY_API_BASE}/orders/${encodeURIComponent(orderId)}/payments`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Razorpay payments lookup failed (${res.status})`);
  return ((await res.json()) as { items: RazorpayPayment[] }).items ?? [];
}

function hmacEquals(secret: string, payload: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout's handler signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  return hmacEquals(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`, signature);
}

/** Webhook signature: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return hmacEquals(env.RAZORPAY_WEBHOOK_SECRET, rawBody, signature);
}
