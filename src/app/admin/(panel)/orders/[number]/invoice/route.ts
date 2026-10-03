import { getAdmin } from "@/lib/admin/auth";
import { getOrderByNumber } from "@/lib/data/order";
import { ensureInvoice } from "@/lib/invoice";

/** GET /admin/orders/ERY-2026-00001/invoice → the invoice PDF, for the owner to share if a customer asks. */
export async function GET(_request: Request, { params }: RouteContext<"/admin/orders/[number]/invoice">) {
  if (!(await getAdmin())) return new Response("Please sign in.", { status: 401 });
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order || (order.payment_status !== "paid" && order.payment_status !== "refunded")) {
    return new Response("No invoice for this order.", { status: 404 });
  }
  const pdf = await ensureInvoice(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Erayah-${order.order_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
