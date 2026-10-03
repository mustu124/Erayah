import type { NextRequest } from "next/server";

import { getProduct } from "@/lib/data/product";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/shipping-quote?pincode=400001&slug=…&quantity=1 → { fee, estDaysMin, estDaysMax }.
 * Uses the shipping rules in the database (pincode-prefix and default rules;
 * state rules need the state, which checkout asks for). Prices come from the
 * database, never the browser.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pincode = params.get("pincode") ?? "";
  const quantity = Math.min(20, Math.max(1, Number(params.get("quantity")) || 1));
  if (!/^[1-9]\d{5}$/.test(pincode)) return Response.json({ error: "Please enter a 6-digit pincode." }, { status: 400 });

  const product = await getProduct(params.get("slug") ?? "");
  if (!product?.price) return Response.json({ error: "This piece isn't available." }, { status: 404 });

  const { data, error } = await createAdminClient().rpc("quote_shipping", {
    p_pincode: pincode,
    p_state: "",
    p_order_value: product.price * quantity,
  });
  if (error) {
    console.error("quote_shipping:", error.message);
    return Response.json({ error: "Couldn't check that pincode just now." }, { status: 500 });
  }
  const rule = data?.[0];
  if (!rule) return Response.json({ error: "We'll confirm delivery to this pincode on WhatsApp." }, { status: 404 });

  return Response.json(
    { fee: rule.fee, estDaysMin: rule.est_days_min, estDaysMax: rule.est_days_max },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
