import { cacheLife } from "next/cache";

import { PINCODE_RE } from "@/lib/checkout/schema";
import { matchState } from "@/lib/checkout/states";

type PostOffice = { Name: string; District: string; State: string };

/** City and state for a pincode from India Post's public API, cached for days. */
async function lookupPincode(pin: string): Promise<{ city: string; state: string | null } | null> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`postalpincode ${res.status}`);
  const [result] = (await res.json()) as [{ Status: string; PostOffice: PostOffice[] | null }];
  const office = result?.Status === "Success" ? result.PostOffice?.[0] : undefined;
  if (!office) return null;
  return { city: office.District, state: matchState(office.State) };
}

/**
 * GET /api/pincode/400001 → { city, state } to prefill the address form.
 * A miss is not an error for the shopper: they type the city and state.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/pincode/[pin]">) {
  const { pin } = await params;
  if (!PINCODE_RE.test(pin)) return Response.json({ error: "Please enter a 6-digit pincode." }, { status: 400 });
  try {
    const found = await lookupPincode(pin);
    if (!found) return Response.json({ error: "We couldn't find this pincode. Please check it." }, { status: 404 });
    return Response.json(found, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
  } catch (error) {
    console.error("pincode lookup:", error);
    return Response.json({ error: "Lookup unavailable." }, { status: 503 });
  }
}
