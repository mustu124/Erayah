import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { routes } from "@/lib/routes";
import { createPublicClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/supabase/storage";
import type { Enums } from "@/lib/supabase/types";

// ─── Shapes the storefront renders ──────────────────────────────────────────

export type CardImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
};

/** Everything a product card shows: image, name, price, and nothing else. */
export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  soldOut: boolean;
  image: CardImage | null;
  hoverImage: CardImage | null;
};

export type ImageRow = {
  storage_path: string;
  role: Enums<"image_role">;
  alt: string;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  sort_order: number;
};

export const CARD_SELECT =
  "id, slug, name, price, stock_qty, product_images(storage_path, role, alt, width, height, blur_data_url, sort_order)";
/**
 * Photos a product card may use, best first: the worn close-up, then the
 * lifestyle shot, then whatever else was uploaded. So a product whose photos
 * have no "Worn close-up" still shows a photo instead of the placeholder.
 */
export const CARD_ROLES: Enums<"image_role">[] = ["worn_closeup", "lifestyle", "product_only", "flat_lay", "detail"];

export function toCardImage(row: ImageRow | undefined): CardImage | null {
  if (!row) return null;
  return {
    url: publicStorageUrl("product-images", row.storage_path),
    alt: row.alt,
    width: row.width ?? 1200,
    height: row.height ?? 1500,
    blurDataUrl: row.blur_data_url,
  };
}

const PLACEHOLDER_PREFIX = "placeholders/";

/** True when the card would only show the ivory placeholder (no photography yet). */
export const hasPhoto = (card: ProductCardData) => !!card.image && !card.image.url.includes(`/${PLACEHOLDER_PREFIX}`);

export function toCard(row: {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  stock_qty: number;
  product_images: ImageRow[];
}): ProductCardData {
  const byRole = (role: Enums<"image_role">) =>
    row.product_images.filter((i) => i.role === role).sort((a, b) => a.sort_order - b.sort_order)[0];
  const ranked = CARD_ROLES.map(byRole).filter((i): i is ImageRow => !!i);
  const main = ranked[0];
  // Hover: the lifestyle shot (or the next photo) when it's a different picture.
  const hover = [byRole("lifestyle"), ...ranked].find((i) => i && main && i.storage_path !== main.storage_path);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    soldOut: row.stock_qty <= 0,
    image: toCardImage(main),
    hoverImage: toCardImage(hover),
  };
}

// ─── Homepage lists ─────────────────────────────────────────────────────────

/** New Arrivals in curated order. */
export async function getNewArrivals(): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(TAGS.home, TAGS.products);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("is_new_arrival", true)
    .in("product_images.role", CARD_ROLES)
    .order("new_arrival_position", { nullsFirst: false })
    .limit(15);
  if (error) console.error("getNewArrivals:", error.message);
  // The homepage only shows pieces that have photographs.
  return (data ?? []).map(toCard).filter(hasPhoto);
}

/** Best Sellers in curated order. */
export async function getBestSellers(): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(TAGS.home, TAGS.products);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("is_best_seller", true)
    .in("product_images.role", CARD_ROLES)
    .order("best_seller_position", { nullsFirst: false })
    .limit(15);
  if (error) console.error("getBestSellers:", error.message);
  // The homepage only shows pieces that have photographs.
  return (data ?? []).map(toCard).filter(hasPhoto);
}

// ─── Hero ───────────────────────────────────────────────────────────────────

export type HeroSlide = {
  key: string;
  label: string | null;
  href: string;
  alt: string;
  desktopUrl: string;
  mobileUrl: string;
  blurDataUrl: string | null;
};

/**
 * Active hero slides. Until the owner adds slides in /admin, the hero shows
 * the hero products, labelled with their category.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  "use cache";
  cacheTag(TAGS.home, TAGS.heroSlides, TAGS.products);
  cacheLife("days");

  const supabase = createPublicClient();
  const { data: slides, error } = await supabase
    .from("hero_slides")
    .select("id, image_desktop_path, image_mobile_path, alt, label, link_url")
    .eq("is_active", true)
    .order("sort_order");
  if (error) console.error("getHeroSlides:", error.message);

  if (slides?.length) {
    return slides.map((s) => ({
      key: `slide-${s.id}`,
      label: s.label,
      href: s.link_url ?? routes.shopAll,
      alt: s.alt,
      desktopUrl: publicStorageUrl("site-media", s.image_desktop_path),
      mobileUrl: publicStorageUrl("site-media", s.image_mobile_path),
      blurDataUrl: null,
    }));
  }

  const { data: heroes, error: heroError } = await supabase
    .from("products")
    .select(
      "id, slug, name, merch_position, categories(slug, name, sort_order), product_images(storage_path, role, alt, blur_data_url, sort_order)",
    )
    .eq("is_hero", true)
    .eq("product_images.role", "worn_closeup");
  if (heroError) console.error("getHeroSlides (fallback):", heroError.message);

  return (heroes ?? [])
    .filter((p) => p.product_images.length && p.categories)
    .sort((a, b) => a.categories!.sort_order - b.categories!.sort_order || (a.merch_position ?? 0) - (b.merch_position ?? 0))
    .map((p) => {
      const image = p.product_images[0];
      const url = publicStorageUrl("product-images", image.storage_path);
      return {
        key: `product-${p.id}`,
        label: p.categories!.name,
        href: routes.collection(p.categories!.slug),
        alt: image.alt,
        desktopUrl: url,
        mobileUrl: url,
        blurDataUrl: image.blur_data_url,
      };
    });
}

// ─── Shop by Category ───────────────────────────────────────────────────────

export type CategoryTile = {
  slug: string;
  name: string;
  href: string;
  comingSoon: boolean;
  image: CardImage | null;
};

/** The Shop All tile's image (Admin → Homepage), or null for the elephant mark. */
export async function getShopAllImage(): Promise<CardImage | null> {
  "use cache";
  cacheTag(TAGS.home, TAGS.siteSettings);
  cacheLife("days");
  const { data, error } = await createPublicClient().from("site_settings").select("shop_all_image_path").eq("id", 1).maybeSingle();
  if (error) console.error("getShopAllImage:", error.message);
  return data?.shop_all_image_path
    ? { url: publicStorageUrl("site-media", data.shop_all_image_path), alt: "Shop All", width: 1200, height: 1200, blurDataUrl: null }
    : null;
}

/**
 * One tile per category. Image: the category's own image if set, otherwise
 * the card image of its first piece in the curated order.
 */
export async function getCategoryTiles(): Promise<CategoryTile[]> {
  "use cache";
  cacheTag(TAGS.home, TAGS.categories, TAGS.products);
  cacheLife("days");

  const supabase = createPublicClient();
  const [{ data: categories, error }, { data: products, error: productError }] = await Promise.all([
    supabase.from("categories").select("id, slug, name, image_path, is_coming_soon").order("sort_order"),
    supabase
      .from("products")
      .select("category_id, merch_position, product_images(storage_path, role, alt, width, height, blur_data_url, sort_order)")
      .eq("product_images.role", "worn_closeup")
      .order("merch_position", { nullsFirst: false }),
  ]);
  if (error) console.error("getCategoryTiles:", error.message);
  if (productError) console.error("getCategoryTiles (images):", productError.message);

  return (categories ?? []).map((c) => {
    const first = (products ?? []).find((p) => p.category_id === c.id && p.product_images.length);
    const image: CardImage | null = c.image_path
      ? { url: publicStorageUrl("site-media", c.image_path), alt: c.name, width: 1200, height: 1200, blurDataUrl: null }
      : toCardImage(first?.product_images[0]);
    return {
      slug: c.slug,
      name: c.name,
      href: routes.collection(c.slug),
      comingSoon: c.is_coming_soon,
      image: image ? { ...image, alt: c.name } : null,
    };
  });
}
