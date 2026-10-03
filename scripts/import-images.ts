// Imports product photography into Supabase from import/mapping.json.
// Run with `pnpm import:images` (`--dry-run` to preview, `--only=<slug>` for
// one product, `--products-only` to skip the hero and category images,
// `--homepage-only` to redo only the hero and category images).
//
// For each mapped product: auto-rotate from EXIF, strip metadata, resize to
// max 2400px, convert to WebP (q82), record width/height and a tiny blur,
// upload to product-images/products/<slug>/<role>-<n>.webp, then replace that
// product's product_images rows. Re-running only replaces the products it
// touches. Also creates the homepage hero slides and category tile images.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";

import type { Database, Enums } from "../src/lib/supabase/types";

type Role = Enums<"image_role">;

const ROLE_ORDER: Role[] = ["worn_closeup", "lifestyle", "product_only", "detail", "flat_lay", "video"];
const ROLE_ALT: Record<Role, string> = {
  worn_closeup: "worn close-up",
  lifestyle: "styled",
  product_only: "product view",
  detail: "detail",
  flat_lay: "flat lay",
  video: "video",
};
const MAX_EDGE = 2400;
const WEBP_QUALITY = 82;
const HERO_FOLDER = "hero";
const HERO_PREFIX = "import-";
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"]);

const mappingSchema = z.object({
  assetsRoot: z.string(),
  products: z.record(
    z.string(),
    z.object({
      images: z.array(z.object({ file: z.string(), role: z.enum(ROLE_ORDER as [Role, ...Role[]]), shot: z.string() })),
      confidence: z.enum(["high", "medium", "low"]),
      note: z.string(),
    }),
  ),
  hero: z.array(
    z.object({ file: z.string(), label: z.string(), category: z.string(), alt: z.string(), position: z.string().optional() }),
  ),
  categories: z.record(z.string(), z.object({ file: z.string(), alt: z.string(), position: z.string().optional() })),
  noPhotos: z.array(z.string()),
});

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const productsOnly = args.includes("--products-only");
const homepageOnly = args.includes("--homepage-only");
const only = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);

const env = z
  .object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) })
  .parse(process.env);
const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const mapping = mappingSchema.parse(JSON.parse(fs.readFileSync(path.join("import", "mapping.json"), "utf8")));
const source = (file: string) => path.join(mapping.assetsRoot, file);

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

// ─── Image processing ───────────────────────────────────────────────────────

type Processed = { buffer: Buffer; width: number; height: number; blur: string; contentType: string; ext: string };

/** Short content hash in file names, so a changed image gets a new URL (no stale CDN or image cache). */
const hashOf = (file: Processed) => createHash("sha1").update(file.buffer).digest("hex").slice(0, 8);

async function removeStale(bucket: "product-images" | "site-media", folder: string, keep: Set<string>, prefix = "") {
  const listed = check(await supabase.storage.from(bucket).list(folder, { limit: 1000 }), `list ${bucket}/${folder}`);
  const stale = (listed ?? [])
    .filter((f) => f.name.startsWith(prefix))
    .map((f) => `${folder}/${f.name}`)
    .filter((p) => !keep.has(p));
  if (stale.length) check(await supabase.storage.from(bucket).remove(stale), `remove stale in ${bucket}/${folder}`);
}

/** `crop.position`: "attention" (default: the most interesting region) or a sharp gravity such as "top". */
async function processImage(file: string, crop?: { width: number; height: number; position?: string }): Promise<Processed> {
  // rotate() applies the EXIF orientation; sharp drops all metadata (EXIF, GPS) by default.
  let pipeline = sharp(source(file)).rotate().flatten({ background: "#f9eee1" });
  pipeline = crop
    ? pipeline.resize({
        width: crop.width,
        height: crop.height,
        fit: "cover",
        position: !crop.position || crop.position === "attention" ? sharp.strategy.attention : crop.position,
      })
    : pipeline.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const { data, info } = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
  const tiny = await sharp(data).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    contentType: "image/webp",
    ext: "webp",
  };
}

const ffmpegAvailable = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
const logs: string[] = [];

function processVideo(file: string): Processed {
  const input = source(file);
  if (!ffmpegAvailable) {
    logs.push(`Video uploaded without transcoding (no ffmpeg): ${file}`);
    return { buffer: fs.readFileSync(input), width: 0, height: 0, blur: "", contentType: "video/mp4", ext: path.extname(file).slice(1).toLowerCase() };
  }
  const out = path.join(fs.mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "erayah-")), "out.mp4");
  const run = spawnSync("ffmpeg", ["-y", "-i", input, "-vf", "scale=-2:720", "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-an", "-movflags", "+faststart", out]);
  if (run.status !== 0) throw new Error(`ffmpeg failed for ${file}`);
  return { buffer: fs.readFileSync(out), width: 0, height: 720, blur: "", contentType: "video/mp4", ext: "mp4" };
}

async function upload(bucket: "product-images" | "site-media", storagePath: string, file: Processed) {
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file.buffer, {
    contentType: file.contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`upload ${bucket}/${storagePath}: ${error.message}`);
}

// ─── Products ───────────────────────────────────────────────────────────────

async function importProduct(slug: string, entry: z.infer<typeof mappingSchema>["products"][string]) {
  const product = check(
    await supabase.from("products").select("id, name").eq("slug", slug).maybeSingle(),
    `read ${slug}`,
  );
  if (!product) {
    logs.push(`No product with slug ${slug}; skipped.`);
    return;
  }

  const counters = new Map<Role, number>();
  const rows: Database["public"]["Tables"]["product_images"]["Insert"][] = [];
  const keep = new Set<string>();
  let bytes = 0;

  for (const image of entry.images) {
    const n = (counters.get(image.role) ?? 0) + 1;
    counters.set(image.role, n);
    const isVideo = VIDEO_EXT.has(path.extname(image.file).toLowerCase());
    const processed = isVideo ? processVideo(image.file) : await processImage(image.file);
    const storagePath = `products/${slug}/${image.role}-${n}-${hashOf(processed)}.${processed.ext}`;
    keep.add(storagePath);
    bytes += processed.buffer.length;
    if (!dryRun) await upload("product-images", storagePath, processed);
    rows.push({
      product_id: product.id,
      storage_path: storagePath,
      role: isVideo ? "video" : image.role,
      alt: `${product.name} – ${ROLE_ALT[isVideo ? "video" : image.role]}`,
      width: processed.width || null,
      height: processed.height || null,
      blur_data_url: processed.blur || null,
      sort_order: 0,
    });
  }

  // Cards need a hover image: with no styled shot, reuse the worn close-up file.
  if (!rows.some((r) => r.role === "lifestyle")) {
    const worn = rows.find((r) => r.role === "worn_closeup");
    if (worn) rows.push({ ...worn, role: "lifestyle", alt: `${product.name} – ${ROLE_ALT.lifestyle}` });
  }

  rows.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  rows.forEach((r, i) => (r.sort_order = i + 1));

  console.log(
    `${dryRun ? "[dry] " : ""}${slug}: ${entry.images.length} file(s), ${(bytes / 1024).toFixed(0)} KB → ` +
      rows.map((r) => r.role).join(", "),
  );
  if (dryRun) return;

  check(await supabase.from("product_images").delete().eq("product_id", product.id), `clear images for ${slug}`);
  check(await supabase.from("product_images").insert(rows), `insert images for ${slug}`);

  // Remove files from earlier imports of this product that are no longer used.
  await removeStale("product-images", `products/${slug}`, keep);
}

// ─── Homepage hero and category tiles ───────────────────────────────────────

async function importHero() {
  const rows: Database["public"]["Tables"]["hero_slides"]["Insert"][] = [];
  const keep = new Set<string>();
  for (const [i, slide] of mapping.hero.entries()) {
    const n = i + 1;
    const desktop = await processImage(slide.file, { width: 1600, height: 2000, position: slide.position });
    const mobile = await processImage(slide.file, { width: 1080, height: 1350, position: slide.position });
    const desktopPath = `${HERO_FOLDER}/${HERO_PREFIX}${n}-desktop-${hashOf(desktop)}.webp`;
    const mobilePath = `${HERO_FOLDER}/${HERO_PREFIX}${n}-mobile-${hashOf(mobile)}.webp`;
    keep.add(desktopPath).add(mobilePath);
    console.log(`${dryRun ? "[dry] " : ""}hero ${n}: ${slide.label} (${(desktop.buffer.length / 1024).toFixed(0)} KB / ${(mobile.buffer.length / 1024).toFixed(0)} KB)`);
    if (!dryRun) {
      await upload("site-media", desktopPath, desktop);
      await upload("site-media", mobilePath, mobile);
    }
    rows.push({
      image_desktop_path: desktopPath,
      image_mobile_path: mobilePath,
      alt: slide.alt,
      label: slide.label,
      link_url: `/shop/${slide.category}`,
      sort_order: n,
      is_active: true,
    });
  }
  if (dryRun) return;
  // Replace only the slides this script created; slides added in /admin stay.
  check(
    await supabase.from("hero_slides").delete().like("image_desktop_path", `${HERO_FOLDER}/${HERO_PREFIX}%`),
    "clear imported hero slides",
  );
  check(await supabase.from("hero_slides").insert(rows), "insert hero slides");
  await removeStale("site-media", HERO_FOLDER, keep, HERO_PREFIX);
}

async function importCategoryTiles() {
  for (const [slug, tile] of Object.entries(mapping.categories)) {
    const image = await processImage(tile.file, { width: 1200, height: 1200, position: tile.position });
    const storagePath = `categories/${slug}-${hashOf(image)}.webp`;
    console.log(`${dryRun ? "[dry] " : ""}category ${slug}: ${(image.buffer.length / 1024).toFixed(0)} KB`);
    if (dryRun) continue;
    await upload("site-media", storagePath, image);
    check(await supabase.from("categories").update({ image_path: storagePath }).eq("slug", slug), `update ${slug}`);
    await removeStale("site-media", "categories", new Set([storagePath]), `${slug}`);
  }
}

// ─── Run ────────────────────────────────────────────────────────────────────

async function main() {
  const missingFiles = Object.values(mapping.products)
    .flatMap((p) => p.images.map((i) => i.file))
    .concat(mapping.hero.map((h) => h.file), Object.values(mapping.categories).map((c) => c.file))
    .filter((f) => !fs.existsSync(source(f)));
  if (missingFiles.length) throw new Error(`Missing source files:\n  ${missingFiles.join("\n  ")}`);

  const entries = Object.entries(mapping.products).filter(([slug]) => !only || slug === only);
  if (only && !entries.length) throw new Error(`No mapping for --only=${only}`);

  if (!homepageOnly) for (const [slug, entry] of entries) await importProduct(slug, entry);
  if (!only && !productsOnly) {
    await importHero();
    await importCategoryTiles();
  }

  console.log(`\n${dryRun ? "Dry run: nothing written. " : ""}${entries.length} product(s) processed.`);
  if (mapping.noPhotos.length) console.log(`No photos yet (placeholders kept): ${mapping.noPhotos.join(", ")}`);
  for (const line of logs) console.log(`Note: ${line}`);
  if (!dryRun) console.log("Redeploy or rebuild so cached pages pick up the new images.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
