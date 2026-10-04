import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// An in-memory Postgres (PGlite) with Supabase's schemas stubbed and every
// migration applied. Shared by the database tests (pnpm test:db).

const MIG = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");

export async function createDb() {
  const db = new PGlite({ extensions: { pg_trgm, unaccent, pgcrypto } });
  await db.exec(`create schema extensions; create schema auth; create schema storage; create schema cron;
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create table auth.users (id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
 create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
 create table storage.objects (id bigserial primary key, bucket_id text, name text);
 -- pg_cron stand-in. schedule() always inserts, so a duplicate job would show up.
 create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
 create function cron.schedule(n text, s text, c text) returns bigint language sql as
   $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
 create function cron.unschedule(id bigint) returns boolean language sql as
   $$ delete from cron.job where jobid = id returning true $$;`);
  const files = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
  const apply = async (f) => {
    try {
      await db.exec(fs.readFileSync(path.join(MIG, f), "utf8").replace(/create extension if not exists pg_cron[^;]*;/g, ""));
    } catch (e) {
      console.error("FAILED", f, e.message);
      process.exit(1);
    }
  };
  for (const f of files) await apply(f);
  return { db, files, apply };
}

/** A tiny check runner: ok(condition, message), and done() to exit with the right code. */
export function checker(title) {
  let fails = 0;
  const ok = (cond, message) => {
    console.log(`${cond ? "✓" : "✗"} ${message}`);
    if (!cond) fails++;
  };
  const done = () => {
    console.log(fails ? `\n${fails} FAILED (${title})` : `\nAll ${title} checks passed`);
    process.exit(fails ? 1 : 0);
  };
  return { ok, done };
}
