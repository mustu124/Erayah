"use server";

import { z } from "zod";

import { adminAction, check, optionalText } from "@/lib/admin/action";
import { TAGS } from "@/lib/cache-tags";
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

const storyInput = z
  .object({
    text: z.string().trim().min(10, "Write two or three lines.").max(600),
    highlight: optionalText(80),
    ctaLabel: optionalText(30),
    ctaUrl: link,
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
      .update({ brand_story_text: v.text, brand_story_highlight: v.highlight, brand_story_cta_label: v.ctaLabel, brand_story_cta_url: v.ctaUrl, announcement_text: v.announcement })
      .eq("id", 1),
    "settings",
  );
  return { message: "Homepage text saved." };
});
