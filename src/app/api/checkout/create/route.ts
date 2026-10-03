import { after } from "next/server";

import { createRequestSchema } from "@/lib/checkout/schema";
import { callCreateOrder, handle, parseBody, toItems } from "@/lib/checkout/server";
import type { CheckoutError, CreateResponse } from "@/lib/checkout/types";
import { env } from "@/lib/env";
import { afterOrderPlaced } from "@/lib/invoice";
import { createRazorpayOrder } from "@/lib/razorpay/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/checkout/create → creates the order (stock reserved, prices from
 * the database) and its Razorpay order, and returns what Razorpay Checkout
 * needs. The idempotency key identifies one checkout attempt: sending it again
 * (double click, retry after a failed payment) reuses the same pending order.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await parseBody(request, createRequestSchema);
    if (body instanceof Response) return body;

    const order = await callCreateOrder({
      idempotency_key: body.idempotencyKey,
      items: toItems(body.items),
      customer: { name: body.address.name, email: body.contact.email, phone: body.contact.phone },
      address: {
        line1: body.address.line1,
        line2: body.address.line2,
        landmark: body.address.landmark,
        city: body.address.city,
        state: body.address.state,
        pincode: body.address.pincode,
      },
      gift_card_code: body.giftCardCode,
      is_gift: body.isGift,
      gift_note: body.giftNote,
    });

    if (order.payment_status === "paid" || order.status === "placed") {
      // Fully paid by gift card (or this attempt was already paid).
      if (!order.existing) after(() => afterOrderPlaced(order.order_id!));
      return Response.json({
        kind: "placed",
        orderNumber: order.order_number!,
        accessToken: order.access_token!,
      } satisfies CreateResponse);
    }
    if (order.status !== "pending_payment") {
      // This attempt expired (unpaid for an hour). The client starts a new one.
      return Response.json(
        { code: "ATTEMPT_EXPIRED", error: "This checkout timed out. Please place your order again." } satisfies CheckoutError,
        { status: 409 },
      );
    }

    let razorpayOrderId = order.razorpay_order_id ?? null;
    if (!razorpayOrderId) {
      try {
        const rzp = await createRazorpayOrder({
          amount: order.total,
          receipt: order.order_number!,
          notes: { order_id: order.order_id!, order_number: order.order_number! },
        });
        razorpayOrderId = rzp.id;
      } catch (error) {
        console.error("razorpay order:", error);
        return Response.json(
          { code: "GATEWAY", error: "We couldn't reach the payment gateway. Please try again in a moment." } satisfies CheckoutError,
          { status: 502 },
        );
      }
      const { error } = await createAdminClient()
        .from("orders")
        .update({ razorpay_order_id: razorpayOrderId })
        .eq("id", order.order_id!);
      if (error) throw new Error(`save razorpay_order_id: ${error.message}`);
    }

    return Response.json({
      kind: "razorpay",
      orderNumber: order.order_number!,
      accessToken: order.access_token!,
      keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      razorpayOrderId,
      amount: order.total,
      currency: "INR",
      prefill: { name: body.address.name, email: body.contact.email, contact: `+91${body.contact.phone}` },
    } satisfies CreateResponse);
  });
}
