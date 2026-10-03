// Runs a Supabase CLI command against the live database through the session
// pooler, using SUPABASE_DB_PASSWORD from .env.local (no `supabase login` or
// `link` needed). Usage: node scripts/supabase-db.mjs db push
//                        node scripts/supabase-db.mjs migration list
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

process.loadEnvFile(".env.local");

const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD is missing from .env.local (Supabase → Project Settings → Database).");
  process.exit(1);
}
const host = process.env.SUPABASE_POOLER_HOST ?? "aws-0-ap-northeast-2.pooler.supabase.com";
const dbUrl = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:5432/postgres`;

// Run the CLI's own entry with node (no shell, so the URL is passed untouched).
const cli = path.join(path.dirname(createRequire(import.meta.url).resolve("supabase/package.json")), "dist/supabase.js");
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2), "--db-url", dbUrl], { stdio: "inherit" });
process.exit(result.status ?? 1);
