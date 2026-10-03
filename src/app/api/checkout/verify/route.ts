import { after } from "next/server";

import { verifyRequestSchema } from "@/lib/checkout/schema";
import { handle, parseBody } from "@/lib/checkout/server";
import type { CheckoutError } from "@/lib/checkout/types";
import { afterOrderPlaced } from "@/lib/invoice";
import { verifyPaymentSignature } from "@/lib/razorpay/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Confirmed = { order_id: string; order_number: string; access_token: string; status: string; newly_placed: boolean; needs_refund: boolean };

/**
 * POST /api/checkout/verify { razorpay_order_id, razorpay_payment_id,
 * razorpay_signature } → { orderNumber, accessToken }. Called by the browser
 * when Razorpay Checkout reports success. The webhook does the same job;
 * whichever arrives first places the order.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await parseBody(request, verifyRequestSchema);
    if (body instanceof Response) return body;

    if (!verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      return Response.json({ code: "BAD_SIGNATURE", error: "We couldn't verify this payment." } satisfies CheckoutError, {
        status: 400,
      });
    }

    const { data, error } = await createAdminClient().rpc("confirm_payment", {
      p_razorpay_order_id: body.razorpay_order_id,
      p_payment_id: body.razorpay_payment_id,
      p_signature: body.razorpay_signature,
      // The amount was fixed when we created the Razorpay order; the signature ties this payment to it.
      p_amount: null as unknown as number,
      p_source: "checkout",
    });
    if (error) throw new Error(`confirm_payment: ${error.message}`);
    const result = data as unknown as Confirmed;

    if (result.newly_placed) after(() => afterOrderPlaced(result.order_id));
    return Response.json({
      orderNumber: result.order_number,
      accessToken: result.access_token,
      status: result.status,
      needsRefund: result.needs_refund,
    });
  });
}
