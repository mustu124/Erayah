import type { NextRequest } from "next/server";

import { getInstantResults } from "@/lib/data/search";
import { normaliseQuery } from "@/lib/search/synonyms";

/** GET /api/search?q=… → instant results for the header search dropdown. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  if (normaliseQuery(q).length < 2) return Response.json({ products: [], links: [], total: 0 });

  const results = await getInstantResults(q);
  return Response.json(results, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" },
  });
}
