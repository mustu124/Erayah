import { z } from "zod";

import { reconcileOrder } from "@/lib/checkout/reconcile";
import { handle, parseBody } from "@/lib/checkout/server";
import { getOrderForCustomer } from "@/lib/data/order";

const schema = z.object({ orderNumber: z.string().max(40), accessToken: z.string().max(80) });

/**
 * POST /api/checkout/status { orderNumber, accessToken } → { status: placed | processing | unpaid }.
 * Asked by the checkout when Razorpay's window closes or the page comes back
 * without a success callback (e.g. after paying in a UPI app), so a payment
 * that went through is never shown as failed.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await parseBody(request, schema);
    if (body instanceof Response) return body;
    const order = await getOrderForCustomer(body.orderNumber, body.accessToken);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    return Response.json({ status: await reconcileOrder(order, "checkout") }, { headers: { "Cache-Control": "no-store" } });
  });
}
