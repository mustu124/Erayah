"use server";

import { z } from "zod";

import { adminAction, check, optionalText } from "@/lib/admin/action";
import { TAGS } from "@/lib/cache-tags";
import { composeFounderNote, HOME_FOUNDER_NOTE_SLUG } from "@/lib/data/content";
import { createAdminClient } from "@/lib/supabase/admin";

const mediaPath = (folder: string) => z.string().regex(new RegExp(`^${folder}/[\\w.-]+$`), "Please upload an image.");
const link = z
  .string()
  .trim()
  .max(300)
  .refine((v) => !v || v.startsWith("/") || /^https:\/\//.test(v), "Use a link that starts with / (a page on this site) or https://")
  .nullish()
  .transform((v) => v || null);

const slideInput = z.object({
  id: z.number().int().positive().nullable(),
  desktopPath: mediaPath("hero"),
  mobilePath: mediaPath("hero"),
  alt: z.string().trim().min(1, "Describe the image for screen readers.").max(200),
  label: optionalText(40),
  linkUrl: link,
  isActive: z.boolean(),
});

export const saveHeroSlide = adminAction({ role: "owner", schema: slideInput, tags: () => [TAGS.heroSlides, TAGS.home] }, async (s) => {
  const db = createAdminClient();
  const row = { image_desktop_path: s.desktopPath, image_mobile_path: s.mobilePath, alt: s.alt, label: s.label, link_url: s.linkUrl, is_active: s.isActive };
  if (s.id) check(await db.from("hero_slides").update(row).eq("id", s.id), "slide");
  else {
    const last = check(await db.from("hero_slides").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle(), "slide");
    check(await db.from("hero_slides").insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1 }), "slide");
  }
  return { message: s.id ? "Slide saved." : "Slide added." };
});

export const deleteHeroSlide = adminAction({ role: "owner", schema: z.object({ id: z.number().int().positive() }), tags: () => [TAGS.heroSlides, TAGS.home] }, async ({ id }) => {
  check(await createAdminClient().from("hero_slides").delete().eq("id", id), "slide");
  return { message: "Slide removed." };
});

export const reorderHeroSlides = adminAction(
  { role: "owner", schema: z.object({ ids: z.array(z.number().int().positive()).max(30) }), tags: () => [TAGS.heroSlides, TAGS.home] },
  async ({ ids }) => {
    const db = createAdminClient();
    for (const [i, id] of ids.entries()) check(await db.from("hero_slides").update({ sort_order: i }).eq("id", id), "slide");
    return { message: "Slide order saved." };
  },
);

export const saveCategoryImage = adminAction(
  { role: "owner", schema: z.object({ categoryId: z.number().int().positive(), imagePath: mediaPath("categories") }), tags: () => [TAGS.categories, TAGS.home] },
  async ({ categoryId, imagePath }) => {
    check(await createAdminClient().from("categories").update({ image_path: imagePath }).eq("id", categoryId), "category");
    return { message: "Category image saved." };
  },
);

export const saveShopAllImage = adminAction(
  { role: "owner", schema: z.object({ imagePath: mediaPath("categories") }), tags: () => [TAGS.siteSettings, TAGS.home] },
  async ({ imagePath }) => {
    check(await createAdminClient().from("site_settings").update({ shop_all_image_path: imagePath }).eq("id", 1), "settings");
    return { message: "Shop All image saved." };
  },
);

const storyInput = z
  .object({
    text: z.string().trim().min(10, "Write a line or two.").max(600),
    highlight: optionalText(80),
    announcement: optionalText(140),
  })
  .refine((v) => !v.highlight || v.text.toLowerCase().includes(v.highlight.toLowerCase()), {
    message: "The highlighted phrase must appear in the text exactly.",
    path: ["highlight"],
  });

export const saveHomepageText = adminAction({ role: "owner", schema: storyInput, tags: () => [TAGS.siteSettings, TAGS.home] }, async (v) => {
  check(
    await createAdminClient()
      .from("site_settings")
      .update({ brand_story_text: v.text, brand_story_highlight: v.highlight, announcement_text: v.announcement })
      .eq("id", 1),
    "settings",
  );
  return { message: "Homepage text saved." };
});

const founderInput = z.object({
  note: z.string().trim().min(10, "Write the note.").max(2000),
  name: optionalText(80),
  role: optionalText(80),
});

/** The homepage founder's note, kept as a pages row (the shop reads it with getHomeFounderNote). */
export const saveFounderNote = adminAction({ role: "owner", schema: founderInput, tags: () => [TAGS.pages, TAGS.home] }, async (v) => {
  const paragraphs = v.note
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const body = composeFounderNote({ paragraphs, name: v.name ?? "", role: v.role ?? "" });
  check(
    await createAdminClient().from("pages").upsert({ slug: HOME_FOUNDER_NOTE_SLUG, title: "Homepage founder's note", body }, { onConflict: "slug" }),
    "founder's note",
  );
  return { message: "Founder's note saved." };
});
