/**
 * pnpm tsx scripts/compress-photos.mts [--apply]
 *
 * Re-encodes product photos that are larger than they need to be (over
 * 450 KB or wider than 1600 px) as WebP, at most 1600 px wide and 2400 px
 * tall, quality 80. Each new file gets a new content-hashed path and the
 * photo's row is pointed at it. The old file is left in Storage (nothing is
 * deleted), so this can be undone by pointing the row back.
 *
 * Why: the Next image optimiser downloads the original from Supabase each time
 * it makes a resized copy, and that counts towards the monthly egress.
 * Without --apply it only reports what it would save.
 */
import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

process.loadEnvFile(".env.local");
const APPLY = process.argv.includes("--apply");
const MAX_BYTES = 450 * 1024;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 2400;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const BUCKET = "product-images";

const { data: rows, error } = await db.from("product_images").select("id, product_id, storage_path, role, width, height").neq("role", "video");
if (error) throw error;

let before = 0;
let after = 0;
let changed = 0;
for (const row of rows ?? []) {
  const { data: file, error: dl } = await db.storage.from(BUCKET).download(row.storage_path);
  if (dl || !file) {
    console.error(`skip ${row.storage_path}: ${dl?.message ?? "missing"}`);
    continue;
  }
  const original = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(original).metadata();
  before += original.length;
  if (original.length <= MAX_BYTES && (meta.width ?? 0) <= MAX_WIDTH) {
    after += original.length;
    continue;
  }

  const { data: webp, info } = await sharp(original)
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  if (webp.length >= original.length * 0.9) {
    after += original.length;
    continue;
  }
  after += webp.length;
  changed++;

  const dir = row.storage_path.slice(0, row.storage_path.lastIndexOf("/"));
  const base = row.storage_path.slice(row.storage_path.lastIndexOf("/") + 1).replace(/\.[a-z]+$/i, "").replace(/-[0-9a-f]{8}$/, "");
  const path = `${dir}/${base}-${createHash("sha256").update(webp).digest("hex").slice(0, 8)}.webp`;
  console.log(`${row.storage_path}  ${Math.round(original.length / 1024)} KB → ${Math.round(webp.length / 1024)} KB  (${info.width}×${info.height})`);

  if (APPLY) {
    const up = await db.storage.from(BUCKET).upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
    if (up.error) throw up.error;
    const set = await db.from("product_images").update({ storage_path: path, width: info.width, height: info.height }).eq("id", row.id);
    if (set.error) throw set.error;
  }
}

const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
console.log(`\n${changed} of ${rows?.length ?? 0} photos ${APPLY ? "re-encoded" : "would be re-encoded"}: ${mb(before)} MB → ${mb(after)} MB`);
if (!APPLY) console.log("Dry run. Run again with --apply to upload and switch the photos.");
