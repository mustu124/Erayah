import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { createPublicClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/supabase/storage";
import type { Enums } from "@/lib/supabase/types";

import { CARD_ROLES, CARD_SELECT, toCard, type ProductCardData } from "./catalog";

export const productTag = (slug: string) => `product:${slug}`;

export type GalleryItem = {
  key: string;
  role: Enums<"image_role">;
  url: string;
  alt: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
};

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  stockQty: number;
  shortDescription: string | null;
  description: string | null;
  materials: string[];
  stones: string[];
  closure: string | null;
  chainLength: string | null;
  careOverride: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: { id: number; slug: string; name: string } | null;
  gallery: GalleryItem[];
  variants: { label: string; colour: string | null; stockQty: number }[];
};

const ROLE_ORDER: Enums<"image_role">[] = ["worn_closeup", "lifestyle", "product_only", "detail", "flat_lay", "video"];

/** A published product with its gallery (by sort_order, one entry per file) and variants. */
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(TAGS.products, productTag(slug));
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      "id, slug, name, price, stock_qty, short_description, description, materials, stones, closure, chain_length, care_override, seo_title, seo_description, categories(id, slug, name), product_images(storage_path, role, alt, width, height, blur_data_url, sort_order), product_variants(label, colour, stock_qty, sort_order)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) console.error("getProduct:", error.message);
  if (!data) return null;

  const seen = new Set<string>();
  const gallery = [...data.product_images]
    .sort((a, b) => a.sort_order - b.sort_order || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
    .filter((image) => !seen.has(image.storage_path) && seen.add(image.storage_path))
    .map((image) => ({
      key: image.storage_path,
      role: image.role,
      url: publicStorageUrl("product-images", image.storage_path),
      alt: image.alt,
      width: image.width ?? 1200,
      height: image.height ?? 1500,
      blurDataUrl: image.blur_data_url,
    }));

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    price: data.price,
    stockQty: data.stock_qty,
    shortDescription: data.short_description,
    description: data.description,
    materials: data.materials,
    stones: data.stones,
    closure: data.closure,
    chainLength: data.chain_length,
    careOverride: data.care_override,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    category: data.categories,
    gallery,
    variants: [...data.product_variants]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({ label: v.label, colour: v.colour, stockQty: v.stock_qty })),
  };
}

/** Every published product slug (for generateStaticParams). */
export async function getAllProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("days");

  const { data, error } = await createPublicClient().from("products").select("slug").order("id");
  if (error) console.error("getAllProductSlugs:", error.message);
  return (data ?? []).map((p) => p.slug);
}

/** Product cards for these ids, in the given order (unpublished ones drop out). */
export async function getCardsByIds(ids: number[]): Promise<ProductCardData[]> {
  if (!ids.length) return [];
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .in("id", ids)
    .in("product_images.role", CARD_ROLES);
  if (error) console.error("getCardsByIds:", error.message);
  const byId = new Map((data ?? []).map((row) => [row.id, toCard(row)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** Product cards for these slugs, in the given order (for Recently Viewed). */
export async function getCardsBySlugs(slugs: string[]): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("hours");

  if (!slugs.length) return [];
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .in("slug", slugs)
    .in("product_images.role", CARD_ROLES);
  if (error) console.error("getCardsBySlugs:", error.message);
  const bySlug = new Map((data ?? []).map((row) => [row.slug, toCard(row)]));
  return slugs.flatMap((slug) => bySlug.get(slug) ?? []);
}

const MIN_LOOK = 3;
const FILL_TO = 4;

/**
 * "Complete the Look": the owner's picks (product_relations); if fewer than 3,
 * topped up with pieces from the same category at the closest price.
 */
export async function getCompleteTheLook(product: { id: number; slug: string; price: number | null; categoryId: number | null }): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(TAGS.products, productTag(product.slug));
  cacheLife("days");

  const supabase = createPublicClient();
  const { data: relations, error } = await supabase
    .from("product_relations")
    .select("related_product_id, sort_order")
    .eq("product_id", product.id)
    .eq("kind", "complete_the_look")
    .order("sort_order");
  if (error) console.error("getCompleteTheLook:", error.message);

  const picks = await getCardsByIds((relations ?? []).map((r) => r.related_product_id));
  if (picks.length >= MIN_LOOK || product.categoryId === null) return picks;

  const { data: siblings } = await supabase
    .from("products")
    .select("id, price")
    .eq("category_id", product.categoryId)
    .neq("id", product.id)
    .not("price", "is", null);
  const taken = new Set(picks.map((p) => p.id));
  const fillIds = (siblings ?? [])
    .filter((s) => !taken.has(s.id))
    .sort((a, b) => Math.abs((a.price ?? 0) - (product.price ?? 0)) - Math.abs((b.price ?? 0) - (product.price ?? 0)))
    .slice(0, FILL_TO - picks.length)
    .map((s) => s.id);
  return [...picks, ...(await getCardsByIds(fillIds))];
}
