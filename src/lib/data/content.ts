import { cacheLife, cacheTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { publicEnv } from "@/lib/env/public";
import { createPublicClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/supabase/storage";

import { type CardImage, CARD_SELECT, type ImageRow, toCardImage } from "./catalog";

// Content pages (About, Contact, FAQs, policies). All editable in /admin;
// each read is tagged so a save there refreshes the page at once.

/** `portrait`: taller than wide (saved with the upload when known), so the page can frame it as a portrait. */
export type PageImage = { url: string; alt: string; role: "hero" | "founder" | "story"; portrait?: boolean };
export type ContentPage = { slug: string; title: string; body: string; seoTitle: string | null; seoDescription: string | null; images: PageImage[] };

export async function getPage(slug: string): Promise<ContentPage | null> {
  "use cache";
  cacheTag(TAGS.pages);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("pages").select("slug, title, body, seo_title, seo_description, images").eq("slug", slug).maybeSingle();
  if (error) console.error("getPage:", error.message);
  if (!data) return null;
  const images = (Array.isArray(data.images) ? data.images : []) as { path: string; alt: string; role: PageImage["role"]; width?: number; height?: number }[];
  return {
    slug: data.slug,
    title: data.title,
    body: data.body,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    images: images.map((i) => ({ url: publicStorageUrl("site-media", i.path), alt: i.alt, role: i.role, portrait: !!i.width && !!i.height && i.height > i.width })),
  };
}

/** Where the homepage founder's note is kept (a pages row, edited in Admin → Homepage). */
export const HOME_FOUNDER_NOTE_SLUG = "home-founder-note";

export type FounderNoteText = { paragraphs: string[]; name: string; role: string };

/** Paragraphs, then the name in **bold**, then the title (the same shape the admin form writes). */
export function parseFounderNote(body: string): FounderNoteText | null {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const nameAt = blocks.findIndex((b) => /^\*\*.+\*\*$/.test(b));
  const paragraphs = nameAt === -1 ? blocks : blocks.slice(0, nameAt);
  if (!paragraphs.length) return null;
  return { paragraphs, name: nameAt === -1 ? "" : blocks[nameAt].replace(/\*\*/g, ""), role: nameAt === -1 ? "" : (blocks[nameAt + 1] ?? "") };
}

export const composeFounderNote = (n: FounderNoteText) =>
  [...n.paragraphs, n.name ? `**${n.name}**` : "", n.role].filter(Boolean).join("\n\n");

export async function getHomeFounderNote(): Promise<FounderNoteText | null> {
  const page = await getPage(HOME_FOUNDER_NOTE_SLUG);
  return page ? parseFounderNote(page.body) : null;
}

export type Faq = { id: number; question: string; answer: string; group: string };

/** The six groups, in the order /faqs shows them; any other group follows. */
export const FAQ_GROUPS = ["Orders & Payment", "Shipping", "Exchanges", "Care", "Gifting", "Sizing"];

export async function getFaqGroups(): Promise<{ group: string; faqs: Faq[] }[]> {
  "use cache";
  cacheTag(TAGS.faqs);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("faqs").select("id, question, answer, group_name").eq("is_active", true).order("sort_order");
  if (error) console.error("getFaqGroups:", error.message);
  const byGroup = new Map<string, Faq[]>();
  for (const f of data ?? []) {
    const group = f.group_name?.trim() || "More questions";
    byGroup.set(group, [...(byGroup.get(group) ?? []), { id: f.id, question: f.question, answer: f.answer, group }]);
  }
  const rank = (g: string) => (FAQ_GROUPS.includes(g) ? FAQ_GROUPS.indexOf(g) : FAQ_GROUPS.length);
  return [...byGroup.entries()].sort(([a], [b]) => rank(a) - rank(b)).map(([group, faqs]) => ({ group, faqs }));
}

export type Testimonial = { id: number; quote: string; author: string; location: string | null };

export async function getTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheTag(TAGS.testimonials);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("testimonials").select("id, quote, author_name, location").eq("is_active", true).order("sort_order").limit(6);
  if (error) console.error("getTestimonials:", error.message);
  return (data ?? []).map((t) => ({ id: t.id, quote: t.quote, author: t.author_name, location: t.location }));
}

export type ContactDetails = {
  whatsappNumber: string;
  email: string | null;
  phone: string | null;
  instagramUrl: string;
  instagramHandle: string;
  businessHours: string | null;
};

export async function getContactDetails(): Promise<ContactDetails> {
  "use cache";
  cacheTag(TAGS.siteSettings);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("site_settings").select("whatsapp_number, support_email, support_phone, instagram_url, business_hours").eq("id", 1).maybeSingle();
  if (error) console.error("getContactDetails:", error.message);
  const instagramUrl = data?.instagram_url || publicEnv.NEXT_PUBLIC_INSTAGRAM_URL;
  const handle = instagramUrl.match(/instagram\.com\/([\w.]+)/)?.[1];
  return {
    whatsappNumber: data?.whatsapp_number || publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER,
    email: data?.support_email || null,
    phone: data?.support_phone || null,
    instagramUrl,
    instagramHandle: `@${handle ?? "erayah"}`,
    businessHours: data?.business_hours || null,
  };
}

/**
 * Photography for the About page until its own photos are uploaded: the
 * first hero slide (wide opening) and lifestyle/worn shots of hero pieces.
 */
export async function getAboutFallbackImages(): Promise<{ hero: CardImage | null; story: CardImage[] }> {
  "use cache";
  cacheTag(TAGS.heroSlides, TAGS.products);
  cacheLife("max");
  const db = createPublicClient();
  const [{ data: slide }, { data: products }] = await Promise.all([
    db.from("hero_slides").select("image_desktop_path, alt").eq("is_active", true).order("sort_order").limit(1).maybeSingle(),
    db.from("products").select(CARD_SELECT).eq("is_published", true).eq("is_hero", true).order("merch_position", { nullsFirst: false }).limit(12),
  ]);
  const story: CardImage[] = [];
  for (const p of products ?? []) {
    const rows = (p.product_images as ImageRow[]).filter((i) => i.role === "lifestyle" || i.role === "worn_closeup").sort((a, b) => (a.role === "lifestyle" ? -1 : 1) - (b.role === "lifestyle" ? -1 : 1));
    const img = toCardImage(rows[0]);
    if (img && !img.url.includes("/placeholders/") && !story.some((s) => s.url === img.url)) story.push(img);
    if (story.length === 3) break;
  }
  return {
    hero: slide ? { url: publicStorageUrl("site-media", slide.image_desktop_path), alt: slide.alt, width: 1600, height: 2000, blurDataUrl: null } : null,
    story,
  };
}
