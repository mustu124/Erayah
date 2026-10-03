"use server";

import { z } from "zod";

import { adminAction, check, optionalText } from "@/lib/admin/action";
import { TAGS } from "@/lib/cache-tags";
import { createAdminClient } from "@/lib/supabase/admin";

const id = z.object({ id: z.number().int().positive() });
const ids = z.object({ ids: z.array(z.number().int().positive()).max(300) });

// ─── FAQs ──────────────────────────────────────────────────────────────────

const faqInput = z.object({
  id: z.number().int().positive().nullable(),
  question: z.string().trim().min(5, "Write the question.").max(200),
  answer: z.string().trim().min(5, "Write the answer.").max(3000),
  group: optionalText(60),
  isActive: z.boolean(),
});

export const saveFaq = adminAction({ role: "owner", schema: faqInput, tags: () => [TAGS.faqs] }, async (f) => {
  const db = createAdminClient();
  const row = { question: f.question, answer: f.answer, group_name: f.group, is_active: f.isActive };
  if (f.id) check(await db.from("faqs").update(row).eq("id", f.id), "FAQ");
  else {
    const last = check(await db.from("faqs").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle(), "FAQ");
    check(await db.from("faqs").insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1 }), "FAQ");
  }
  return { message: f.id ? "FAQ saved." : "FAQ added." };
});

export const deleteFaq = adminAction({ role: "owner", schema: id, tags: () => [TAGS.faqs] }, async ({ id }) => {
  check(await createAdminClient().from("faqs").delete().eq("id", id), "FAQ");
  return { message: "FAQ removed." };
});

export const reorderFaqs = adminAction({ role: "owner", schema: ids, tags: () => [TAGS.faqs] }, async ({ ids }) => {
  const db = createAdminClient();
  for (const [i, faqId] of ids.entries()) check(await db.from("faqs").update({ sort_order: i }).eq("id", faqId), "FAQ");
  return { message: "FAQ order saved." };
});

// ─── Testimonials ──────────────────────────────────────────────────────────

const testimonialInput = z.object({
  id: z.number().int().positive().nullable(),
  quote: z.string().trim().min(5, "Write the quote.").max(600),
  authorName: z.string().trim().min(1, "Who said it?").max(80),
  location: optionalText(80),
  isActive: z.boolean(),
});

export const saveTestimonial = adminAction({ role: "owner", schema: testimonialInput, tags: () => [TAGS.testimonials, TAGS.home] }, async (t) => {
  const db = createAdminClient();
  const row = { quote: t.quote, author_name: t.authorName, location: t.location, is_active: t.isActive };
  if (t.id) check(await db.from("testimonials").update(row).eq("id", t.id), "testimonial");
  else {
    const last = check(await db.from("testimonials").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle(), "testimonial");
    check(await db.from("testimonials").insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1 }), "testimonial");
  }
  return { message: t.id ? "Testimonial saved." : "Testimonial added." };
});

export const deleteTestimonial = adminAction({ role: "owner", schema: id, tags: () => [TAGS.testimonials, TAGS.home] }, async ({ id }) => {
  check(await createAdminClient().from("testimonials").delete().eq("id", id), "testimonial");
  return { message: "Testimonial removed." };
});

export const reorderTestimonials = adminAction({ role: "owner", schema: ids, tags: () => [TAGS.testimonials, TAGS.home] }, async ({ ids }) => {
  const db = createAdminClient();
  for (const [i, tId] of ids.entries()) check(await db.from("testimonials").update({ sort_order: i }).eq("id", tId), "testimonial");
  return { message: "Order saved." };
});

// ─── Pages ─────────────────────────────────────────────────────────────────

const pageInput = z.object({
  slug: z.enum(["about", "shipping-returns", "privacy-policy", "terms"]),
  title: z.string().trim().min(2, "Give the page a title.").max(120),
  body: z.string().max(40_000),
  seoTitle: optionalText(70),
  seoDescription: optionalText(170),
  images: z
    .array(
      z.object({
        path: z.string().regex(/^about\/[\w.-]+$/),
        alt: z.string().trim().min(1, "Describe each photo.").max(200),
        role: z.enum(["hero", "founder", "story"]),
      }),
    )
    .max(12),
});

export const savePage = adminAction({ role: "owner", schema: pageInput, tags: () => [TAGS.pages] }, async (p) => {
  check(
    await createAdminClient()
      .from("pages")
      .update({ title: p.title, body: p.body, seo_title: p.seoTitle, seo_description: p.seoDescription, images: p.images, updated_at: new Date().toISOString() })
      .eq("slug", p.slug),
    "page",
  );
  return { message: "Page saved." };
});
