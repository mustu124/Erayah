import "server-only";

import { CARD_SELECT, toCard } from "@/lib/data/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/storage";

// Merchandising: the order customers see in each collection.
// Scopes: a category id ("12"), "new-arrivals", "best-sellers" or "shop-all".

export type MerchScope = { kind: "category"; categoryId: number } | { kind: "list"; list: "new-arrivals" | "best-sellers" } | { kind: "shop-all" };

export function parseScope(value: string | undefined): MerchScope | null {
  if (!value) return null;
  if (value === "new-arrivals" || value === "best-sellers") return { kind: "list", list: value };
  if (value === "shop-all") return { kind: "shop-all" };
  return /^\d+$/.test(value) ? { kind: "category", categoryId: Number(value) } : null;
}

export const LIST_COLUMN = { "new-arrivals": "new_arrival_position", "best-sellers": "best_seller_position" } as const;
const LIST_FLAG = { "new-arrivals": "is_new_arrival", "best-sellers": "is_best_seller" } as const;

export type MerchProduct = { id: number; name: string; price: number | null; isHero: boolean; soldOut: boolean; imageUrl: string | null; blur: string | null; category: string };
export type MerchTile = { id: number; imageUrl: string; imagePath: string; alt: string; caption: string; linkUrl: string; span: 1 | 2; insertAfter: number; isActive: boolean };

export async function getMerch(scope: MerchScope): Promise<{ products: MerchProduct[]; tiles: MerchTile[] }> {
  const db = createAdminClient();
  let query = db.from("products").select(`${CARD_SELECT}, is_hero, merch_position, new_arrival_position, best_seller_position, category_id, categories(name, sort_order), product_variants(stock_qty)`).eq("is_published", true);
  if (scope.kind === "category") query = query.eq("category_id", scope.categoryId).order("merch_position", { nullsFirst: false }).order("name");
  else if (scope.kind === "list") query = query.eq(LIST_FLAG[scope.list], true).order(LIST_COLUMN[scope.list], { nullsFirst: false }).order("name");
  else query = query.order("merch_position", { nullsFirst: false }).order("name");
  const { data, error } = await query;
  if (error) throw new Error(`merch products: ${error.message}`);

  let rows = data;
  // Shop All interleaves categories: every category's first pick, then the second picks…
  if (scope.kind === "shop-all") rows = [...rows].sort((a, b) => (a.merch_position ?? 1e9) - (b.merch_position ?? 1e9) || (a.categories?.sort_order ?? 0) - (b.categories?.sort_order ?? 0));

  const products = rows.map((p) => {
    const card = toCard(p);
    const stock = p.product_variants.length ? p.product_variants.reduce((n, v) => n + v.stock_qty, 0) : p.stock_qty;
    return { id: p.id, name: p.name, price: p.price, isHero: p.is_hero, soldOut: stock <= 0, imageUrl: card.image?.url ?? null, blur: card.image?.blurDataUrl ?? null, category: p.categories?.name ?? "" };
  });

  if (scope.kind === "list") return { products, tiles: [] };
  let tileQuery = db.from("lifestyle_tiles").select("id, image_path, alt, caption, link_url, span, insert_after_position, is_active").order("insert_after_position").order("id");
  tileQuery = scope.kind === "category" ? tileQuery.eq("category_id", scope.categoryId) : tileQuery.is("category_id", null);
  const { data: tiles, error: tileError } = await tileQuery;
  if (tileError) throw new Error(`merch tiles: ${tileError.message}`);
  return {
    products,
    tiles: tiles.map((t) => ({
      id: t.id,
      imageUrl: publicStorageUrl("site-media", t.image_path),
      imagePath: t.image_path,
      alt: t.alt,
      caption: t.caption ?? "",
      linkUrl: t.link_url ?? "",
      span: t.span === 2 ? 2 : 1,
      insertAfter: t.insert_after_position,
      isActive: t.is_active,
    })),
  };
}
