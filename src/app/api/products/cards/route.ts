import type { NextRequest } from "next/server";

import { getCardsBySlugs } from "@/lib/data/product";

/** GET /api/products/cards?slugs=a,b,c → product cards in that order (Recently Viewed, the cart drawer, the wishlist). */
export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))
    .slice(0, 40);
  if (!slugs.length) return Response.json([]);

  return Response.json(await getCardsBySlugs(slugs), {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=3600" },
  });
}
