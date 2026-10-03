import type { NextRequest } from "next/server";

import { getOrderForCustomer } from "@/lib/data/order";
import { ensureInvoice } from "@/lib/invoice";

/**
 * GET /api/invoice/ERY-2026-00001?t=<access token> → the invoice PDF.
 * Only for paid, placed orders, and only with the token from the confirmation link.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/invoice/[number]">) {
  const { number } = await params;
  const order = await getOrderForCustomer(number, request.nextUrl.searchParams.get("t"));
  if (!order || order.payment_status !== "paid" || order.status === "cancelled") {
    return new Response("Invoice not found.", { status: 404 });
  }

  const pdf = await ensureInvoice(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Erayah-${order.order_number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
