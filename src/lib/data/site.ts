import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { publicEnv } from "@/lib/env/public";
import { routes } from "@/lib/routes";
import { createPublicClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/supabase/storage";

export type SiteShell = {
  announcementText: string | null;
  whatsappNumber: string;
  instagramUrl: string;
};

/** Settings the site shell needs on every page. Falls back to env values. */
export async function getSiteShell(): Promise<SiteShell> {
  "use cache";
  cacheTag(TAGS.siteSettings);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("site_settings")
    .select("announcement_text, whatsapp_number, instagram_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) console.error("getSiteShell:", error.message);

  return {
    announcementText: data?.announcement_text ?? null,
    whatsappNumber: data?.whatsapp_number || publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER,
    instagramUrl: data?.instagram_url || publicEnv.NEXT_PUBLIC_INSTAGRAM_URL,
  };
}

export type BrandStory = {
  text: string;
  ctaLabel: string;
  ctaUrl: string;
};

/** The homepage brand story (2–3 lines + CTA), from site settings. */
export async function getBrandStory(): Promise<BrandStory | null> {
  "use cache";
  cacheTag(TAGS.home, TAGS.siteSettings);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("site_settings")
    .select("brand_story_text, brand_story_cta_label, brand_story_cta_url")
    .eq("id", 1)
    .maybeSingle();
  if (error) console.error("getBrandStory:", error.message);
  if (!data?.brand_story_text) return null;

  return {
    text: data.brand_story_text,
    ctaLabel: data.brand_story_cta_label || "Our Story",
    ctaUrl: data.brand_story_cta_url || routes.about,
  };
}

export type MenuFeature = {
  imageUrl: string | null;
  alt: string;
  caption: string;
  href: string;
};

/** The editorial tile in the Shop mega-menu: the first active hero slide. */
export async function getMenuFeature(): Promise<MenuFeature> {
  "use cache";
  cacheTag(TAGS.heroSlides);
  cacheLife("days");

  const { data, error } = await createPublicClient()
    .from("hero_slides")
    .select("image_mobile_path, alt, label, link_url")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (error) console.error("getMenuFeature:", error.message);

  if (!data) {
    return { imageUrl: null, alt: "", caption: "Discover New Arrivals", href: routes.newArrivals };
  }
  return {
    imageUrl: publicStorageUrl("site-media", data.image_mobile_path),
    alt: data.alt,
    caption: data.label ? `Discover ${data.label}` : "Discover the collection",
    href: data.link_url ?? routes.shopAll,
  };
}
