import { after } from "next/server";

import { afterOrderPlaced } from "@/lib/invoice";
import { verifyWebhookSignature } from "@/lib/razorpay/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PaymentEntity = {
  id: string;
  order_id: string | null;
  amount: number;
  status: string;
  error_description?: string | null;
  error_reason?: string | null;
};
type RazorpayEvent = {
  event: string;
  payload: { payment?: { entity: PaymentEntity }; order?: { entity: { id: string; amount_paid: number } } };
};

/**
 * Razorpay webhook (Dashboard → Webhooks → <site>/api/webhooks/razorpay,
 * events: payment.captured, order.paid, payment.failed).
 * The signature is checked on the raw body. Replies 2xx once handled (or when
 * there's nothing to do) so Razorpay stops retrying; 5xx makes it retry.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const payment = event.payload.payment?.entity;
  const razorpayOrderId = payment?.order_id ?? event.payload.order?.entity.id;
  if (!payment || !razorpayOrderId) return Response.json({ ignored: event.event });

  const supabase = createAdminClient();

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const { data, error } = await supabase.rpc("confirm_payment", {
      p_razorpay_order_id: razorpayOrderId,
      p_payment_id: payment.id,
      p_signature: null as unknown as string,
      p_amount: payment.amount,
      p_source: `webhook ${event.event}`,
    });
    if (error) {
      // Not ours, or an amount we didn't ask for (logged on the order): nothing to retry.
      if (/ORDER_NOT_FOUND|AMOUNT_MISMATCH/.test(error.message)) {
        console.error(`razorpay webhook ${event.event} ${razorpayOrderId}:`, error.message);
        return Response.json({ ignored: error.message });
      }
      console.error("razorpay webhook confirm_payment:", error.message);
      return Response.json({ error: "retry" }, { status: 500 });
    }
    const result = data as unknown as { order_id: string; newly_placed: boolean };
    if (result.newly_placed) after(() => afterOrderPlaced(result.order_id));
    return Response.json({ ok: true });
  }

  if (event.event === "payment.failed") {
    const { error } = await supabase.rpc("mark_payment_failed", {
      p_razorpay_order_id: razorpayOrderId,
      p_payment_id: payment.id,
      p_reason: payment.error_description ?? payment.error_reason ?? "unknown",
    });
    if (error) {
      console.error("razorpay webhook mark_payment_failed:", error.message);
      return Response.json({ error: "retry" }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ignored: event.event });
}
