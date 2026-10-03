import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/storage";
import type { Database } from "@/lib/supabase/types";

export type ImageRole = Database["public"]["Enums"]["image_role"];

/** The four photos every published product should have, in gallery order. */
export const REQUIRED_ROLES: ImageRole[] = ["worn_closeup", "lifestyle", "product_only", "detail"];
export const OPTIONAL_ROLES: ImageRole[] = ["flat_lay", "video"];

export const ROLE_INFO: Record<ImageRole, { label: string; hint: string }> = {
  worn_closeup: { label: "1 · Worn close-up", hint: "On a model, close. Shown on product cards." },
  lifestyle: { label: "2 · Lifestyle", hint: "Styled scene. Shown when a card is hovered." },
  product_only: { label: "3 · Product only", hint: "The piece alone on a plain background." },
  detail: { label: "4 · Detail close-up", hint: "Stones, setting or clasp up close." },
  flat_lay: { label: "Flat lay (optional)", hint: "Arranged from above." },
  video: { label: "Video (optional)", hint: "Short, silent MP4 or WebM, under 50 MB." },
};

const thumbOf = (images: { storage_path: string; role: ImageRole; sort_order: number }[]) => {
  const pick = [...images].filter((i) => i.role !== "video").sort((a, b) => (a.role === "worn_closeup" ? -1 : 0) - (b.role === "worn_closeup" ? -1 : 0) || a.sort_order - b.sort_order)[0];
  return pick ? publicStorageUrl("product-images", pick.storage_path) : null;
};

export type AdminProductRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  categoryId: number;
  price: number | null;
  stock: number;
  hasVariants: boolean;
  published: boolean;
  flags: { new: boolean; best: boolean; gift: boolean; hero: boolean };
  thumb: string | null;
  missingRoles: ImageRole[];
};

export async function listAdminProducts(f: { q?: string; category?: string; stock?: string }): Promise<AdminProductRow[]> {
  let query = createAdminClient()
    .from("products")
    .select(
      "id, name, slug, category_id, price, stock_qty, is_published, is_new_arrival, is_best_seller, is_gift_for_her, is_hero, categories(name, sort_order), product_variants(stock_qty), product_images(storage_path, role, sort_order)",
    )
    .order("name");
  if (f.category && /^\d+$/.test(f.category)) query = query.eq("category_id", Number(f.category));
  if (f.q) query = query.or(`name.ilike.%${f.q.replace(/[^\p{L}\p{N} -]/gu, "")}%,slug.ilike.%${f.q.replace(/[^a-z0-9-]/gi, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(`list products: ${error.message}`);

  const rows = data.map((p) => {
    const stock = p.product_variants.length ? p.product_variants.reduce((n, v) => n + v.stock_qty, 0) : p.stock_qty;
    const roles = new Set(p.product_images.map((i) => i.role));
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.categories?.name ?? "",
      categoryId: p.category_id,
      price: p.price,
      stock,
      hasVariants: p.product_variants.length > 0,
      published: p.is_published,
      flags: { new: p.is_new_arrival, best: p.is_best_seller, gift: p.is_gift_for_her, hero: p.is_hero },
      thumb: thumbOf(p.product_images),
      missingRoles: REQUIRED_ROLES.filter((r) => !roles.has(r)),
    };
  });
  if (f.stock === "low") return rows.filter((r) => r.published && r.stock > 0 && r.stock <= 2);
  if (f.stock === "out") return rows.filter((r) => r.published && r.stock === 0);
  return rows;
}

export type EditableImage = {
  id: number;
  role: ImageRole;
  path: string;
  url: string;
  alt: string;
  sortOrder: number;
};

export type RelatedPick = { id: number; name: string; thumb: string | null };

export type EditableProduct = {
  id: number | null;
  name: string;
  slug: string;
  categoryId: number | null;
  price: number | null;
  shortDescription: string;
  description: string;
  materials: string[];
  stones: string[];
  colours: string[];
  styles: string[];
  closure: string;
  chainLength: string;
  careOverride: string;
  stockQty: number;
  isPublished: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isGiftForHer: boolean;
  isHero: boolean;
  seoTitle: string;
  seoDescription: string;
  variants: { id: number | null; label: string; colour: string | null; stockQty: number }[];
  completeTheLook: RelatedPick[];
  crossSell: RelatedPick[];
};

export const EMPTY_PRODUCT: EditableProduct = {
  id: null, name: "", slug: "", categoryId: null, price: null, shortDescription: "", description: "",
  materials: [], stones: [], colours: [], styles: [], closure: "", chainLength: "", careOverride: "",
  stockQty: 0, isPublished: false, isNewArrival: false, isBestSeller: false, isGiftForHer: false, isHero: false,
  seoTitle: "", seoDescription: "", variants: [], completeTheLook: [], crossSell: [],
};

export async function getEditableProduct(id: number) {
  const db = createAdminClient();
  const { data: p, error } = await db
    .from("products")
    .select("*, product_variants(id, label, colour, stock_qty, sort_order), product_images(id, storage_path, role, alt, sort_order)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`load product: ${error.message}`);
  if (!p) return null;

  const [{ data: relations }, { count: orderCount }] = await Promise.all([
    db
      .from("product_relations")
      .select("kind, sort_order, related:products!product_relations_related_product_id_fkey(id, name, product_images(storage_path, role, sort_order))")
      .eq("product_id", id)
      .order("sort_order"),
    db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id),
  ]);

  const pick = (kind: string): RelatedPick[] =>
    (relations ?? [])
      .filter((r) => r.kind === kind && r.related)
      .map((r) => ({ id: r.related!.id, name: r.related!.name, thumb: thumbOf(r.related!.product_images) }));

  const product: EditableProduct = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.category_id,
    price: p.price,
    shortDescription: p.short_description ?? "",
    description: p.description ?? "",
    materials: p.materials,
    stones: p.stones,
    colours: p.colours,
    styles: p.styles,
    closure: p.closure ?? "",
    chainLength: p.chain_length ?? "",
    careOverride: p.care_override ?? "",
    stockQty: p.stock_qty,
    isPublished: p.is_published,
    isNewArrival: p.is_new_arrival,
    isBestSeller: p.is_best_seller,
    isGiftForHer: p.is_gift_for_her,
    isHero: p.is_hero,
    seoTitle: p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
    variants: [...p.product_variants].sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ id: v.id, label: v.label, colour: v.colour, stockQty: v.stock_qty })),
    completeTheLook: pick("complete_the_look"),
    crossSell: pick("cross_sell"),
  };
  const images: EditableImage[] = [...p.product_images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ id: i.id, role: i.role, path: i.storage_path, url: publicStorageUrl("product-images", i.storage_path), alt: i.alt, sortOrder: i.sort_order }));
  return { product, images, ordered: (orderCount ?? 0) > 0 };
}

export async function listCategories() {
  const { data, error } = await createAdminClient().from("categories").select("id, slug, name, image_path, sort_order, is_coming_soon").order("sort_order");
  if (error) throw new Error(`categories: ${error.message}`);
  return data;
}
