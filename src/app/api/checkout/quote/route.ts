import { quoteRequestSchema } from "@/lib/checkout/schema";
import { callCreateOrder, handle, parseBody, toItems, toQuoteResponse } from "@/lib/checkout/server";

/**
 * POST /api/checkout/quote { items, pincode?, state?, giftCardCode? } → the
 * order summary priced by the database (create_order dry run: nothing is
 * reserved or written).
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = await parseBody(request, quoteRequestSchema);
    if (body instanceof Response) return body;
    const quote = await callCreateOrder({
      dry_run: true,
      items: toItems(body.items),
      address: { pincode: body.pincode ?? null, state: body.state ?? null },
      gift_card_code: body.giftCardCode,
    });
    return Response.json(toQuoteResponse(quote), { headers: { "Cache-Control": "no-store" } });
  });
}
