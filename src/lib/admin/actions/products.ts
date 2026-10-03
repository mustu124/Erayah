"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { adminAction, AdminError, check, optionalText, rupees } from "@/lib/admin/action";
import { requireAdmin } from "@/lib/admin/auth";
import { SLUG_RE } from "@/lib/admin/slug";
import { TAGS } from "@/lib/cache-tags";
import { COLOURS, STYLES } from "@/lib/collection/params";
import { productTag } from "@/lib/data/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/storage";

const BUCKET = "product-images";
const ROLES = ["worn_closeup", "lifestyle", "product_only", "detail", "flat_lay", "video"] as const;

const list = (max: number) => z.array(z.string().trim().min(1).max(60)).max(max).transform((a) => [...new Set(a)]);

const productInput = z
  .object({
    id: z.number().int().positive().nullable(),
    name: z.string().trim().min(2, "Please give the product a name.").max(120),
    slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Use lowercase letters, numbers and dashes only.").max(80),
    categoryId: z.number({ error: "Please choose a category." }).int().positive("Please choose a category."),
    price: rupees.nullable(),
    shortDescription: optionalText(300),
    description: optionalText(5000),
    materials: list(12),
    stones: list(12),
    colours: z.array(z.enum(COLOURS)).max(COLOURS.length),
    styles: z.array(z.enum(STYLES)).max(STYLES.length),
    closure: optionalText(120),
    chainLength: optionalText(120),
    careOverride: optionalText(1500),
    stockQty: z.coerce.number().int().min(0, "Stock can't be negative.").max(100_000),
    isPublished: z.boolean(),
    isNewArrival: z.boolean(),
    isBestSeller: z.boolean(),
    isGiftForHer: z.boolean(),
    isHero: z.boolean(),
    seoTitle: optionalText(70),
    seoDescription: optionalText(170),
    variants: z
      .array(
        z.object({
          id: z.number().int().positive().nullable(),
          label: z.string().trim().min(1, "Each option needs a name.").max(40),
          colour: z.enum(COLOURS).nullable(),
          stockQty: z.coerce.number().int().min(0).max(100_000),
        }),
      )
      .max(30)
      .refine((v) => new Set(v.map((x) => x.label.toLowerCase())).size === v.length, "Two options have the same name."),
    completeTheLook: z.array(z.number().int().positive()).max(12),
    crossSell: z.array(z.number().int().positive()).max(12),
  })
  .refine((p) => !p.isPublished || (p.price !== null && p.price > 0), { message: "Set a price before publishing.", path: ["price"] });

/** Creates or updates a product with its options and related-product lists. */
export const saveProduct = adminAction(
  { schema: productInput, tags: (p) => [TAGS.products, TAGS.home, productTag(p.slug)] },
  async (p) => {
    const db = createAdminClient();
    const existing = p.id ? check(await db.from("products").select("slug, is_published, published_at").eq("id", p.id).maybeSingle(), "product") : null;
    if (p.id && !existing) throw new AdminError("This product no longer exists.");

    const clash = check(await db.from("products").select("id").eq("slug", p.slug).neq("id", p.id ?? 0).maybeSingle(), "product");
    if (clash) throw new AdminError("Another product already uses this web address (slug). Please change it.");

    const row = {
      name: p.name,
      slug: p.slug,
      category_id: p.categoryId,
      price: p.price,
      short_description: p.shortDescription,
      description: p.description,
      materials: p.materials,
      stones: p.stones,
      colours: p.colours,
      styles: p.styles,
      closure: p.closure,
      chain_length: p.chainLength,
      care_override: p.careOverride,
      // With options, stock lives on each option.
      stock_qty: p.variants.length ? 0 : p.stockQty,
      is_published: p.isPublished,
      is_new_arrival: p.isNewArrival,
      is_best_seller: p.isBestSeller,
      is_gift_for_her: p.isGiftForHer,
      is_hero: p.isHero,
      seo_title: p.seoTitle,
      seo_description: p.seoDescription,
      published_at: p.isPublished ? (existing?.published_at ?? new Date().toISOString()) : (existing?.published_at ?? null),
    };

    let id = p.id;
    if (id) {
      check(await db.from("products").update(row).eq("id", id), "product");
    } else {
      // New pieces go to the end of their category's curated order.
      const last = check(
        await db.from("products").select("merch_position").eq("category_id", p.categoryId).not("merch_position", "is", null).order("merch_position", { ascending: false }).limit(1).maybeSingle(),
        "product",
      );
      const created = check(await db.from("products").insert({ ...row, merch_position: (last?.merch_position ?? 0) + 1 }).select("id").single(), "product");
      id = created.id;
    }

    // Options: update, add, remove.
    const keep = p.variants.filter((v) => v.id).map((v) => v.id!);
    const stale = db.from("product_variants").delete().eq("product_id", id);
    check(await (keep.length ? stale.not("id", "in", `(${keep.join(",")})`) : stale), "option");
    for (const [i, v] of p.variants.entries()) {
      const values = { product_id: id, label: v.label, colour: v.colour, stock_qty: v.stockQty, sort_order: i };
      check(await (v.id ? db.from("product_variants").update(values).eq("id", v.id).eq("product_id", id) : db.from("product_variants").insert(values)), "option");
    }

    // Related products, in the chosen order.
    check(await db.from("product_relations").delete().eq("product_id", id), "related product");
    const relations = [
      ...p.completeTheLook.filter((r) => r !== id).map((r, i) => ({ product_id: id!, related_product_id: r, kind: "complete_the_look" as const, sort_order: i })),
      ...p.crossSell.filter((r) => r !== id).map((r, i) => ({ product_id: id!, related_product_id: r, kind: "cross_sell" as const, sort_order: i })),
    ];
    if (relations.length) check(await db.from("product_relations").insert(relations), "related product");

    if (existing && existing.slug !== p.slug) updateTag(productTag(existing.slug));
    return { message: p.id ? "Product saved." : "Product created.", data: { id } };
  },
);

const quickInput = z.object({
  id: z.number().int().positive(),
  price: rupees.optional(),
  stockQty: z.coerce.number().int().min(0, "Stock can't be negative.").max(100_000).optional(),
});

/** Inline price / stock edits from the products table. */
export const quickUpdateProduct = adminAction({ schema: quickInput, tags: () => [TAGS.products, TAGS.home] }, async ({ id, price, stockQty }) => {
  const db = createAdminClient();
  const update: { price?: number; stock_qty?: number } = {};
  if (price !== undefined) {
    if (price <= 0) throw new AdminError("The price must be more than ₹0.");
    update.price = price;
  }
  if (stockQty !== undefined) {
    const { count } = await db.from("product_variants").select("id", { count: "exact", head: true }).eq("product_id", id);
    if (count) throw new AdminError("This piece has options; set stock for each option in the editor.");
    update.stock_qty = stockQty;
  }
  check(await db.from("products").update(update).eq("id", id), "product");
  return { message: price !== undefined ? "Price saved." : "Stock saved." };
});

const idInput = z.object({ id: z.number().int().positive() });

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

/** A draft copy (unpublished, no flags) with the same photos, options and related products. */
export const duplicateProduct = adminAction({ schema: idInput }, async ({ id }) => {
  const db = createAdminClient();
  const src = check(await db.from("products").select("*, product_variants(*), product_images(*), product_relations!product_relations_product_id_fkey(*)").eq("id", id).single(), "product");
  let slug = `${src.slug}-copy`.slice(0, 80);
  for (let n = 2; check(await db.from("products").select("id").eq("slug", slug).maybeSingle(), "product"); n++) slug = `${src.slug}-copy-${n}`.slice(0, 80);

  const { product_variants, product_images, product_relations, ...product } = src;
  const fields = omit(product, ["id", "created_at", "updated_at", "search_vector"]);
  const copy = check(
    await db
      .from("products")
      .insert({
        ...fields,
        name: `${src.name} (copy)`,
        slug,
        is_published: false,
        published_at: null,
        is_new_arrival: false,
        is_best_seller: false,
        is_gift_for_her: false,
        is_hero: false,
        new_arrival_position: null,
        best_seller_position: null,
        merch_position: src.merch_position === null ? null : src.merch_position + 1,
      })
      .select("id")
      .single(),
    "product",
  );
  if (product_variants.length)
    check(await db.from("product_variants").insert(product_variants.map((v) => ({ ...omit(v, ["id"]), product_id: copy.id }))), "option");
  if (product_images.length)
    check(await db.from("product_images").insert(product_images.map((i) => ({ ...omit(i, ["id"]), product_id: copy.id }))), "photo");
  if (product_relations.length)
    check(await db.from("product_relations").insert(product_relations.map((r) => ({ ...r, product_id: copy.id }))), "related product");
  return { message: "Copy created as a draft.", data: { id: copy.id } };
});

/** Archive = unpublish. It disappears from the shop but keeps its history. */
export const archiveProduct = adminAction({ schema: idInput, tags: () => [TAGS.products, TAGS.home] }, async ({ id }) => {
  check(await createAdminClient().from("products").update({ is_published: false }).eq("id", id), "product");
  return { message: "Archived. It's hidden from the shop." };
});

/** Deletes a product that has never been ordered, with its photos. */
export const deleteProduct = adminAction({ schema: idInput, tags: () => [TAGS.products, TAGS.home] }, async ({ id }) => {
  const db = createAdminClient();
  const { count } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if (count) throw new AdminError("This piece has been ordered, so it can't be deleted. Archive it instead.");
  const images = check(await db.from("product_images").select("storage_path").eq("product_id", id), "photo");
  check(await db.from("products").delete().eq("id", id), "product");
  await removeUnusedFiles(images.map((i) => i.storage_path));
  return { message: "Product deleted." };
});

// ─── Photos ────────────────────────────────────────────────────────────────

/** Deletes files from storage that no product image row points at any more. */
async function removeUnusedFiles(paths: string[]) {
  const db = createAdminClient();
  const unique = [...new Set(paths)];
  if (!unique.length) return;
  const stillUsed = check(await db.from("product_images").select("storage_path").in("storage_path", unique), "photo");
  const used = new Set(stillUsed.map((r) => r.storage_path));
  const remove = unique.filter((p) => !used.has(p) && !p.startsWith("placeholders/"));
  if (remove.length) await db.storage.from(BUCKET).remove(remove);
}

const imageInput = z.object({
  productId: z.number().int().positive(),
  /** Replaces this photo (same slot) when set. */
  replaceId: z.number().int().positive().nullable(),
  path: z.string().regex(/^products\/[a-z0-9-]+\/[\w.-]+$/, "Upload failed. Please try again."),
  role: z.enum(ROLES),
  alt: z.string().trim().min(1, "Describe the photo for screen readers.").max(200),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  blurDataUrl: z.string().max(4000).regex(/^data:image\/(webp|jpeg|png);base64,/).nullable(),
});

export const saveProductImage = adminAction({ schema: imageInput, tags: () => [TAGS.products, TAGS.home] }, async (i) => {
  const db = createAdminClient();
  const values = { storage_path: i.path, role: i.role, alt: i.alt, width: i.width, height: i.height, blur_data_url: i.blurDataUrl };
  if (i.replaceId) {
    const old = check(await db.from("product_images").select("storage_path").eq("id", i.replaceId).eq("product_id", i.productId).single(), "photo");
    check(await db.from("product_images").update(values).eq("id", i.replaceId), "photo");
    await removeUnusedFiles([old.storage_path]);
    return { message: "Photo replaced." };
  }
  const last = check(await db.from("product_images").select("sort_order").eq("product_id", i.productId).order("sort_order", { ascending: false }).limit(1).maybeSingle(), "photo");
  check(await db.from("product_images").insert({ ...values, product_id: i.productId, sort_order: (last?.sort_order ?? -1) + 1 }), "photo");
  return { message: "Photo added." };
});

export const deleteProductImage = adminAction({ schema: z.object({ id: z.number().int().positive() }), tags: () => [TAGS.products, TAGS.home] }, async ({ id }) => {
  const db = createAdminClient();
  const row = check(await db.from("product_images").select("storage_path").eq("id", id).single(), "photo");
  check(await db.from("product_images").delete().eq("id", id), "photo");
  await removeUnusedFiles([row.storage_path]);
  return { message: "Photo removed." };
});

export const reorderProductImages = adminAction(
  { schema: z.object({ productId: z.number().int().positive(), ids: z.array(z.number().int().positive()).max(40) }), tags: () => [TAGS.products, TAGS.home] },
  async ({ productId, ids }) => {
    const db = createAdminClient();
    for (const [i, id] of ids.entries()) check(await db.from("product_images").update({ sort_order: i }).eq("id", id).eq("product_id", productId), "photo");
    return { message: "Photo order saved." };
  },
);

export const updateImageAlt = adminAction(
  { schema: z.object({ id: z.number().int().positive(), alt: z.string().trim().min(1, "Describe the photo.").max(200) }), tags: () => [TAGS.products] },
  async ({ id, alt }) => {
    check(await createAdminClient().from("product_images").update({ alt }).eq("id", id), "photo");
    return { message: "Description saved." };
  },
);

// ─── Product search for pickers ───────────────────────────────────────────

export async function searchProductsForPicker(q: string, excludeId: number | null) {
  await requireAdmin();
  const term = q.replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 60);
  let query = createAdminClient().from("products").select("id, name, is_published, product_images(storage_path, role, sort_order)").order("name").limit(12);
  if (term) query = query.ilike("name", `%${term}%`);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return (data ?? []).map((p) => {
    const img = [...p.product_images].filter((i) => i.role !== "video").sort((a, b) => a.sort_order - b.sort_order)[0];
    return { id: p.id, name: p.name, published: p.is_published, thumb: img ? publicStorageUrl(BUCKET, img.storage_path) : null };
  });
}
