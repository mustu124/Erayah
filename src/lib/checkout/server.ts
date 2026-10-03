import "server-only";

import type { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/storage";

import { checkoutErrorFrom } from "./errors";
import { fieldErrors } from "./schema";
import type { CheckoutError, OrderQuote, QuoteResponse } from "./types";

/** Calls create_order. Throws a CheckoutError-shaped Response on failure. */
export async function callCreateOrder(payload: Record<string, unknown>): Promise<OrderQuote> {
  const { data, error } = await createAdminClient().rpc("create_order", { payload: payload as never });
  if (error) {
    const { status, ...body } = checkoutErrorFrom(error.message);
    if (status === 500) console.error("create_order:", error.message);
    throw Response.json(body satisfies CheckoutError, { status });
  }
  return data as unknown as OrderQuote;
}

export const toItems = (items: { productId: number; variantLabel?: string | null; quantity: number }[]) =>
  items.map((i) => ({ product_id: i.productId, variant_label: i.variantLabel ?? null, quantity: i.quantity }));

export function toQuoteResponse(q: OrderQuote): QuoteResponse {
  return {
    lines: (q.lines ?? []).map((l) => ({ ...l, imageUrl: l.image ? publicStorageUrl("product-images", l.image) : null })),
    subtotal: q.subtotal,
    shippingFee: q.shipping_fee,
    giftCardCode: q.gift_card_code,
    giftCardAmount: q.gift_card_amount,
    gstAmount: q.gst_amount,
    total: q.total,
    estDaysMin: q.est_days_min ?? null,
    estDaysMax: q.est_days_max ?? null,
  };
}

/** Parses a JSON body against a schema, or returns a 400 Response. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T> | Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." } satisfies CheckoutError, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return Response.json(
      { error: Object.values(fields)[0] ?? "Please check your details.", fields } satisfies CheckoutError,
      { status: 400 },
    );
  }
  return parsed.data;
}

/** Runs a handler and turns thrown Responses into replies. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    console.error("checkout:", thrown);
    return Response.json({ error: "Something went wrong on our side. Please try again." } satisfies CheckoutError, {
      status: 500,
    });
  }
}
