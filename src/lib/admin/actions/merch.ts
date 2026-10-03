"use server";

import { z } from "zod";

import { adminAction, AdminError, check, optionalText } from "@/lib/admin/action";
import { TAGS } from "@/lib/cache-tags";
import { createAdminClient } from "@/lib/supabase/admin";

const MERCH_TAGS = () => [TAGS.products, TAGS.categories, TAGS.lifestyleTiles, TAGS.home];

const orderInput = z.object({
  scope: z.string().regex(/^(\d+|new-arrivals|best-sellers|shop-all)$/),
  items: z
    .array(z.object({ type: z.enum(["product", "tile"]), id: z.number().int().positive() }))
    .max(500),
});

/**
 * Saves the order shown in the merchandising grid. Products get positions
 * 1, 2, 3…; a lifestyle tile is stored as "after N products".
 */
export const saveMerchOrder = adminAction({ role: "owner", schema: orderInput, tags: MERCH_TAGS }, async ({ scope, items }) => {
  const db = createAdminClient();
  const column: "new_arrival_position" | "best_seller_position" | "merch_position" =
    scope === "new-arrivals" ? "new_arrival_position" : scope === "best-sellers" ? "best_seller_position" : "merch_position";
  if (scope === "shop-all") throw new AdminError("Shop All follows each category's order. Reorder a category instead.");

  let position = 0;
  for (const item of items) {
    if (item.type === "product") {
      position += 1;
      check(await db.from("products").update({ [column]: position } as Record<typeof column, number>).eq("id", item.id), "product");
    } else if (/^\d+$/.test(scope)) {
      check(await db.from("lifestyle_tiles").update({ insert_after_position: position }).eq("id", item.id).eq("category_id", Number(scope)), "tile");
    }
  }
  return { message: "Order saved. The shop shows it now." };
});

const tileInput = z.object({
  id: z.number().int().positive().nullable(),
  categoryId: z.number().int().positive().nullable(),
  imagePath: z.string().regex(/^tiles\/[\w.-]+$/, "Please upload an image."),
  alt: z.string().trim().min(1, "Describe the image for screen readers.").max(200),
  caption: optionalText(120),
  linkUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || v.startsWith("/") || /^https:\/\//.test(v), "Use a link that starts with / (a page on this site) or https://")
    .nullish()
    .transform((v) => v || null),
  span: z.union([z.literal(1), z.literal(2)]),
  insertAfter: z.coerce.number().int().min(0).max(500),
  isActive: z.boolean(),
});

export const saveTile = adminAction({ role: "owner", schema: tileInput, tags: MERCH_TAGS }, async (t) => {
  const db = createAdminClient();
  const row = {
    category_id: t.categoryId,
    image_path: t.imagePath,
    alt: t.alt,
    caption: t.caption,
    link_url: t.linkUrl,
    span: t.span,
    insert_after_position: t.insertAfter,
    is_active: t.isActive,
  };
  if (t.id) check(await db.from("lifestyle_tiles").update(row).eq("id", t.id), "tile");
  else check(await db.from("lifestyle_tiles").insert(row), "tile");
  return { message: t.id ? "Tile saved." : "Tile added." };
});

export const deleteTile = adminAction({ role: "owner", schema: z.object({ id: z.number().int().positive() }), tags: MERCH_TAGS }, async ({ id }) => {
  const db = createAdminClient();
  const tile = check(await db.from("lifestyle_tiles").select("image_path").eq("id", id).single(), "tile");
  check(await db.from("lifestyle_tiles").delete().eq("id", id), "tile");
  const { count } = await db.from("lifestyle_tiles").select("id", { count: "exact", head: true }).eq("image_path", tile.image_path);
  if (!count) await db.storage.from("site-media").remove([tile.image_path]);
  return { message: "Tile removed." };
});
