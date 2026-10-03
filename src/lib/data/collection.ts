import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { COLOURS, PAGE_SIZE, STYLES, type Filters } from "@/lib/collection/params";
import { CATEGORY_DESCRIPTIONS, isListSlug, listScope, type Scope } from "@/lib/collection/scopes";
import { routes } from "@/lib/routes";
import { createPublicClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/supabase/storage";

import { CARD_ROLES, CARD_SELECT, hasPhoto, toCard, toCardImage, type CardImage, type ProductCardData } from "./catalog";

// ─── Categories and scopes ──────────────────────────────────────────────────

export type CategoryInfo = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  comingSoon: boolean;
};

export async function getCategories(): Promise<CategoryInfo[]> {
  "use cache";
  cacheTag(TAGS.categories);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, slug, name, description, seo_title, seo_description, is_coming_soon")
    .order("sort_order");
  if (error) console.error("getCategories:", error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    seoTitle: c.seo_title,
    seoDescription: c.seo_description,
    comingSoon: c.is_coming_soon,
  }));
}

/** /shop/<slug>: a category or a curated list. */
export async function resolveShopScope(slug: string): Promise<Scope | null> {
  if (isListSlug(slug)) return listScope(slug);
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return null;
  const description = category.description ?? CATEGORY_DESCRIPTIONS[slug] ?? null;
  return {
    key: `category:${slug}`,
    path: routes.collection(slug),
    title: category.name,
    description,
    seoTitle: category.seoTitle ?? category.name,
    seoDescription:
      category.seoDescription ??
      `${category.name} by Erayah. ${description ?? ""} Handcrafted in 22kt gold-plated silver alloy with kundan, jadau and polki.`.trim(),
    category: slug,
    list: null,
    styles: null,
    comingSoon: category.comingSoon,
    showCategoryFilter: false,
    showGiftFilter: true,
    tileCategory: slug,
    allowTiles: true,
    productIds: null,
    relevance: false,
  };
}

// ─── Query building ─────────────────────────────────────────────────────────

const LIST_FLAG = {
  "new-arrivals": "is_new_arrival",
  "best-sellers": "is_best_seller",
  "gifts-for-her": "is_gift_for_her",
} as const;

const CURATED_COLUMN = {
  "new-arrivals": "new_arrival_position",
  "best-sellers": "best_seller_position",
  "gifts-for-her": "merch_position",
} as const;

// Narrow structural type for the PostgREST filter methods used below.
type Filterable<Q> = {
  eq(column: string, value: unknown): Q;
  in(column: string, values: readonly unknown[]): Q;
  overlaps(column: string, value: string[]): Q;
  gt(column: string, value: number): Q;
  gte(column: string, value: number): Q;
  lte(column: string, value: number): Q;
};

/** Restricts a products query to the scope (category, list or style). */
function applyScope<Q extends Filterable<Q>>(query: Q, scope: Scope, categoryId: number | null): Q {
  let q = query;
  if (categoryId !== null) q = q.eq("category_id", categoryId);
  if (scope.list) q = q.eq(LIST_FLAG[scope.list], true);
  if (scope.styles) q = q.overlaps("styles", scope.styles);
  if (scope.productIds) q = q.in("id", scope.productIds.length ? scope.productIds : [-1]);
  return q;
}

/** Applies the shopper's filters: OR within a group, AND across groups. */
function applyFilters<Q extends Filterable<Q>>(query: Q, filters: Filters, categoryIds: number[]): Q {
  let q = query;
  if (filters.availability.length === 1) {
    q = filters.availability[0] === "in_stock" ? q.gt("stock_qty", 0) : q.eq("stock_qty", 0);
  }
  if (filters.min !== null) q = q.gte("price", filters.min * 100);
  if (filters.max !== null) q = q.lte("price", filters.max * 100);
  if (filters.colours.length) q = q.overlaps("colours", filters.colours);
  if (filters.styles.length) q = q.overlaps("styles", filters.styles);
  if (filters.categories.length) q = q.in("category_id", categoryIds.length ? categoryIds : [-1]);
  if (filters.gift) q = q.eq("is_gift_for_her", true);
  return q;
}

async function categoryIdFor(scope: Scope): Promise<number | null> {
  if (!scope.category) return null;
  return (await getCategories()).find((c) => c.slug === scope.category)?.id ?? -1;
}

// ─── Listing ────────────────────────────────────────────────────────────────

export type CollectionPage = {
  products: ProductCardData[];
  total: number;
  pageCount: number;
};

/** One page of products, filtered and sorted in Postgres (24 per page). */
export async function getCollectionPage(scope: Scope, filters: Filters): Promise<CollectionPage> {
  "use cache";
  cacheTag(TAGS.products, TAGS.categories);
  cacheLife("hours");

  const categories = await getCategories();
  const categoryId = await categoryIdFor(scope);
  const filterCategoryIds = categories.filter((c) => filters.categories.includes(c.slug)).map((c) => c.id);

  let query = createPublicClient()
    .from("products")
    .select(CARD_SELECT, { count: "exact" })
    .in("product_images.role", CARD_ROLES);
  query = applyScope(query, scope, categoryId);
  query = applyFilters(query, filters, filterCategoryIds);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true }).order("id");
      break;
    case "price-desc":
      query = query.order("price", { ascending: false }).order("id");
      break;
    case "newest":
      query = query.order("published_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
      break;
    case "oldest":
      query = query.order("published_at", { ascending: true }).order("id");
      break;
    default:
      // Curated: the owner's order. Across categories, position 1 of each
      // category comes first, then position 2, so the mix stays varied.
      query = query
        .order(scope.list ? CURATED_COLUMN[scope.list] : "merch_position", { nullsFirst: false })
        .order("category_id")
        .order("id");
  }

  const from = (filters.page - 1) * PAGE_SIZE;

  // Search relevance: matches are few (at most 200), so order them by rank here.
  if (scope.relevance && scope.productIds && filters.sort === "curated") {
    const { data, error } = await query;
    if (error) console.error("getCollectionPage (relevance):", error.message);
    const rank = new Map(scope.productIds.map((id, i) => [id, i]));
    const sorted = (data ?? []).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    return {
      products: sorted.slice(from, from + PAGE_SIZE).map(toCard),
      total: sorted.length,
      pageCount: Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)),
    };
  }

  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") console.error("getCollectionPage:", error.message); // PGRST103: page past the end
  const total = count ?? 0;
  return { products: (data ?? []).map(toCard), total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

// ─── Facets ─────────────────────────────────────────────────────────────────

export type Facets = {
  total: number;
  inStock: number;
  soldOut: number;
  /** Rupees. */
  priceMin: number;
  priceMax: number;
  histogram: number[];
  colours: { value: string; count: number }[];
  styles: { value: string; count: number }[];
  categories: { slug: string; name: string; count: number }[];
  gifts: number;
};

const HISTOGRAM_BINS = 24;
/** Styles offered in the Style filter: shapes first, then the look. */
const FILTER_STYLES = [
  "studs", "danglers", "jhumkas", "chaandbaalis", "bali", "ear cuff", "shoulder drops", "drops",
  "choker", "necklace set", "stackable", "minimal", "statement", "pearl",
] as const;

/** Counts for the filter rail, over the whole scope (not narrowed by the current filters). */
export async function getFacets(scope: Scope): Promise<Facets> {
  "use cache";
  cacheTag(TAGS.products, TAGS.categories);
  cacheLife("hours");

  const categories = await getCategories();
  const categoryId = await categoryIdFor(scope);
  const query = applyScope(
    createPublicClient().from("products").select("price, stock_qty, colours, styles, category_id, is_gift_for_her"),
    scope,
    categoryId,
  );
  const { data, error } = await query;
  if (error) console.error("getFacets:", error.message);
  const rows = (data ?? []).filter((r) => r.price !== null);

  const prices = rows.map((r) => (r.price as number) / 100);
  const priceMin = prices.length ? Math.floor(Math.min(...prices) / 100) * 100 : 0;
  const priceMax = prices.length ? Math.ceil(Math.max(...prices) / 100) * 100 : 0;
  const width = (priceMax - priceMin) / HISTOGRAM_BINS || 1;
  const histogram = Array.from({ length: HISTOGRAM_BINS }, () => 0);
  for (const p of prices) histogram[Math.min(HISTOGRAM_BINS - 1, Math.floor((p - priceMin) / width))] += 1;

  const count = (values: readonly string[], field: "colours" | "styles") =>
    values
      .map((value) => ({ value, count: rows.filter((r) => r[field].includes(value)).length }))
      .filter((v) => v.count > 0);

  return {
    total: rows.length,
    inStock: rows.filter((r) => r.stock_qty > 0).length,
    soldOut: rows.filter((r) => r.stock_qty <= 0).length,
    priceMin,
    priceMax,
    histogram,
    colours: count(COLOURS, "colours"),
    // A style every piece in scope has (e.g. "ring" on Rings) can't narrow anything.
    styles: count(FILTER_STYLES.filter((s) => STYLES.includes(s)), "styles").filter((s) => s.count < rows.length),
    categories: categories
      .map((c) => ({ slug: c.slug, name: c.name, count: rows.filter((r) => r.category_id === c.id).length }))
      .filter((c) => c.count > 0),
    gifts: rows.filter((r) => r.is_gift_for_her).length,
  };
}

// ─── Lifestyle tiles ────────────────────────────────────────────────────────

export type LifestyleTile = {
  key: string;
  image: CardImage;
  caption: string | null;
  href: string | null;
  /** Curated position (1-based, across pages) the tile follows. */
  insertAfter: number;
  span: 1 | 2;
};

/** Tiles the owner configured for this category (or the Shop All tiles). */
export async function getConfiguredTiles(scope: Scope): Promise<LifestyleTile[]> {
  "use cache";
  cacheTag(TAGS.lifestyleTiles, TAGS.categories);
  cacheLife("days");

  const categoryId = await categoryIdFor(scope);
  let query = createPublicClient()
    .from("lifestyle_tiles")
    .select("id, image_path, alt, caption, link_url, insert_after_position, span")
    .eq("is_active", true)
    .order("insert_after_position");
  query = scope.tileCategory && categoryId !== null ? query.eq("category_id", categoryId) : query.is("category_id", null);
  const { data, error } = await query;
  if (error) console.error("getConfiguredTiles:", error.message);

  return (data ?? []).map((t) => ({
    key: `tile-${t.id}`,
    image: { url: publicStorageUrl("site-media", t.image_path), alt: t.alt, width: 1600, height: 900, blurDataUrl: null },
    caption: t.caption,
    href: t.link_url,
    insertAfter: t.insert_after_position,
    span: t.span === 1 ? 1 : 2,
  }));
}

export type TileCandidate = { productId: number; slug: string; name: string; image: CardImage };

/** Photographed products in scope (curated order), for automatic lifestyle tiles. */
export async function getTileCandidates(scope: Scope): Promise<TileCandidate[]> {
  "use cache";
  cacheTag(TAGS.products, TAGS.categories);
  cacheLife("hours");

  const categoryId = await categoryIdFor(scope);
  let query = createPublicClient()
    .from("products")
    .select("id, slug, name, product_images(storage_path, role, alt, width, height, blur_data_url, sort_order)")
    .in("product_images.role", ["lifestyle", "worn_closeup"]);
  query = applyScope(query, scope, categoryId);
  const { data, error } = await query.order(scope.list ? CURATED_COLUMN[scope.list] : "merch_position", { nullsFirst: false }).order("category_id");
  if (error) console.error("getTileCandidates:", error.message);

  return (data ?? []).flatMap((p) => {
    const image =
      toCardImage(p.product_images.find((i) => i.role === "lifestyle")) ??
      toCardImage(p.product_images.find((i) => i.role === "worn_closeup"));
    if (!image || !hasPhoto({ id: p.id, slug: p.slug, name: p.name, price: null, soldOut: false, image, hoverImage: null })) {
      return [];
    }
    return [{ productId: p.id, slug: p.slug, name: p.name, image: { ...image, alt: `${p.name}, worn` } }];
  });
}
