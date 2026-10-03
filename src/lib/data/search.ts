import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { LISTS, STYLE_PAGES } from "@/lib/collection/scopes";
import { routes } from "@/lib/routes";
import { expandQuery, normaliseQuery } from "@/lib/search/synonyms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

import { CARD_ROLES, CARD_SELECT, toCard } from "./catalog";
import { getCategories } from "./collection";

const MAX_MATCHES = 200;

type Hit = { id: number; rank: number };

/**
 * Product ids matching q, best first (at most 200). Uses the search_products
 * RPC (full text + trigram, accents stripped). Until that migration is
 * applied, falls back to a simple name/description/style match.
 */
export async function searchProductIds(q: string): Promise<number[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("hours");
  return (await runSearch(q, MAX_MATCHES)).map((h) => h.id);
}

async function runSearch(q: string, limit: number): Promise<Hit[]> {
  const expanded = expandQuery(q);
  if (!expanded) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_products", { q: expanded, p_limit: limit, p_offset: 0 });
  if (!error) return (data ?? []).map((r) => ({ id: r.id, rank: r.rank }));

  if (error.code !== "PGRST202") {
    console.error("search_products:", error.message);
    return [];
  }

  // Fallback (RPC not deployed yet): every word group must match the name,
  // slug, short description or a style. No typo tolerance beyond the synonyms.
  console.warn("search_products is not in the database yet; using the basic fallback search.");
  let query = supabase.from("products").select("id, merch_position");
  for (const group of expanded.split(" ")) {
    const alts = group.split("|").filter((a) => /^[a-z0-9-]+$/.test(a));
    if (!alts.length) continue;
    query = query.or(
      alts
        .flatMap((a) => [
          `name.ilike.*${a}*`,
          `slug.ilike.*${a}*`, // slugs are unaccented, so "gaja" still finds Gajā
          `short_description.ilike.*${a}*`,
          `styles.cs.{"${a.replace(/-/g, " ")}"}`,
        ])
        .join(","),
    );
  }
  const fallback = await query.order("merch_position", { nullsFirst: false }).limit(limit);
  if (fallback.error) console.error("search fallback:", fallback.error.message);
  return (fallback.data ?? []).map((r, i) => ({ id: r.id, rank: -i }));
}

// ─── Instant results for the header dropdown ───────────────────────────────

export type InstantProduct = { slug: string; name: string; price: number | null; imageUrl: string | null; imageAlt: string };
export type InstantLink = { label: string; href: string };
export type InstantResults = { products: InstantProduct[]; links: InstantLink[]; total: number };

/** Up to 6 products and 3 category/style links for the search dropdown. */
export async function getInstantResults(q: string): Promise<InstantResults> {
  "use cache";
  cacheTag(TAGS.products, TAGS.categories);
  cacheLife("hours");

  const [ids, links] = await Promise.all([searchProductIds(q), matchLinks(q)]);
  const top = ids.slice(0, 6);
  if (!top.length) return { products: [], links, total: 0 };

  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .in("id", top)
    .in("product_images.role", CARD_ROLES);
  if (error) console.error("getInstantResults:", error.message);

  const cards = new Map((data ?? []).map((row) => [row.id, toCard(row)]));
  const products = top.flatMap((id) => {
    const card = cards.get(id);
    return card
      ? [{ slug: card.slug, name: card.name, price: card.price, imageUrl: card.image?.url ?? null, imageAlt: card.image?.alt ?? card.name }]
      : [];
  });
  return { products, links, total: ids.length };
}

/** Categories, curated lists and style pages whose name the query starts or matches. */
async function matchLinks(q: string): Promise<InstantLink[]> {
  const words = expandQuery(q)
    .split(/[\s|]+/)
    .flatMap((w) => [w, ...w.split("-")])
    .filter((w) => w.length >= 3);
  if (!words.length) return [];

  const categories = (await getCategories()).filter((c) => !c.comingSoon);
  const candidates: (InstantLink & { keywords: string[] })[] = [
    ...categories.map((c) => ({ label: c.name, href: routes.collection(c.slug), keywords: [c.slug, c.name] })),
    ...Object.entries(LISTS).map(([slug, l]) => ({ label: l.title, href: routes.collection(slug), keywords: [l.title] })),
    ...Object.entries(STYLE_PAGES).map(([slug, s]) => ({ label: s.title, href: routes.style(slug), keywords: [s.title, ...s.styles] })),
  ];

  const keywordWords = (k: string) => normaliseQuery(k.replace(/[-&]/g, " ")).split(" ").filter((w) => w.length >= 3);
  const matches = candidates.filter((c) =>
    c.keywords.flatMap(keywordWords).some((k) => words.some((w) => k.startsWith(w) || (k.length >= 4 && w.startsWith(k)))),
  );
  const seen = new Set<string>();
  return matches.filter((m) => !seen.has(m.href) && seen.add(m.href)).slice(0, 3).map(({ label, href }) => ({ label, href }));
}

// ─── Misses ─────────────────────────────────────────────────────────────────

/** Records a search that found nothing (term, count, last seen) for the owner. */
export async function logSearchMiss(q: string): Promise<void> {
  const term = normaliseQuery(q);
  if (term.length < 2) return;
  const { error } = await createAdminClient().rpc("log_search_miss", { p_term: term });
  if (error && error.code !== "PGRST202") console.error("log_search_miss:", error.message);
}
