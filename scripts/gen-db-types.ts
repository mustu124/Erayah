// Generates src/lib/supabase/types.ts from supabase/migrations without a
// Supabase login or Docker: the migrations are applied to an in-memory
// Postgres (PGlite) with small stand-ins for Supabase's auth/storage/cron, and
// the resulting schema is written in the same shape as `supabase gen types`.
// Run with `pnpm db:types:local`. Prefer `pnpm db:types` once the CLI is linked.

import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");
const OUT = path.join(process.cwd(), "src", "lib", "supabase", "types.ts");

const SUPABASE_STUBS = `
  create schema extensions; create schema auth; create schema storage; create schema cron;
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id bigserial primary key, bucket_id text, name text);
  create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
`;

type Column = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  is_identity: "YES" | "NO";
  identity_generation: string | null;
};

const SCALARS: Record<string, string> = {
  int2: "number", int4: "number", int8: "number", numeric: "number", float4: "number", float8: "number",
  text: "string", varchar: "string", bpchar: "string", uuid: "string", citext: "string",
  timestamptz: "string", timestamp: "string", date: "string", time: "string", interval: "unknown",
  bool: "boolean", json: "Json", jsonb: "Json", tsvector: "unknown", regdictionary: "unknown",
};

async function main() {
  const db = new PGlite({ extensions: { pg_trgm, unaccent, pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  for (const file of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), "utf8").replace(/create extension if not exists pg_cron;/, "");
    await db.exec(sql);
  }

  const enums = (
    await db.query<{ name: string; value: string }>(`
      select t.typname as name, e.enumlabel as value
      from pg_type t join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' order by t.typname, e.enumsortorder`)
  ).rows;
  const enumValues = new Map<string, string[]>();
  for (const e of enums) enumValues.set(e.name, [...(enumValues.get(e.name) ?? []), e.value]);

  const pgType = (udt: string): string => {
    if (udt.startsWith("_")) return `${pgType(udt.slice(1))}[]`;
    if (enumValues.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
    return SCALARS[udt] ?? "unknown";
  };

  const columns = (
    await db.query<Column>(`
      select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
             c.column_default, c.is_identity, c.identity_generation
      from information_schema.columns c
      join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by c.table_name, c.ordinal_position`)
  ).rows;

  const fks = (
    await db.query<{ name: string; table: string; columns: string[]; ref_table: string; ref_columns: string[]; one_to_one: boolean }>(`
      select con.conname as name, rel.relname as table,
             array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k) as columns,
             ref.relname as ref_table,
             array(select a.attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k) as ref_columns,
             exists (
               select 1 from pg_index i
               where i.indrelid = con.conrelid and i.indisunique
                 and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x) = (select array_agg(x order by x) from unnest(con.conkey) x)
             ) as one_to_one
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_class ref on ref.oid = con.confrelid
      join pg_namespace n on n.oid = rel.relnamespace
      join pg_namespace rn on rn.oid = ref.relnamespace
      where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'
      order by rel.relname, con.conname`)
  ).rows;

  const functions = (
    await db.query<{ name: string; args: string | null; result: string; returns_set: boolean }>(`
      select p.proname as name,
             (select string_agg(coalesce(pa.parameter_name, '') || ':' || pa.udt_name ||
                                 case when pa.parameter_default is not null then '?' else '' end, ',' order by pa.ordinal_position)
              from information_schema.parameters pa
              where pa.specific_name = p.proname || '_' || p.oid and pa.parameter_mode = 'IN') as args,
             pg_get_function_result(p.oid) as result,
             p.proretset as returns_set
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
      order by p.proname`)
  ).rows;

  const sqlToTs = (sqlType: string): string => {
    const t = sqlType.trim().toLowerCase();
    const map: Record<string, string> = {
      integer: "number", bigint: "number", smallint: "number", numeric: "number",
      text: "string", uuid: "string", boolean: "boolean", jsonb: "Json", json: "Json",
      "timestamp with time zone": "string", interval: "unknown",
    };
    return map[t] ?? (enumValues.has(t.replace(/^public\./, "")) ? `Database["public"]["Enums"]["${t.replace(/^public\./, "")}"]` : "unknown");
  };

  const tables = [...new Set(columns.map((c) => c.table_name))];
  const lines: string[] = [];
  const out = (s = "") => lines.push(s);

  out("// Generated by `pnpm db:types:local` from supabase/migrations. Do not edit.");
  out("// `pnpm db:types` (Supabase CLI, linked project) produces the same shape.");
  out();
  out("export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];");
  out();
  out("export type Database = {");
  out("  public: {");
  out("    Tables: {");
  for (const table of tables) {
    const cols = columns.filter((c) => c.table_name === table);
    const tsType = (c: Column) => pgType(c.udt_name);
    out(`      ${table}: {`);
    out("        Row: {");
    for (const c of cols) out(`          ${c.column_name}: ${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""};`);
    out("        };");
    for (const kind of ["Insert", "Update"] as const) {
      out(`        ${kind}: {`);
      for (const c of cols) {
        const generatedAlways = c.is_identity === "YES" && c.identity_generation === "ALWAYS";
        const optional = kind === "Update" || c.is_nullable === "YES" || c.column_default !== null || c.is_identity === "YES";
        const type = generatedAlways ? "never" : `${tsType(c)}${c.is_nullable === "YES" ? " | null" : ""}`;
        out(`          ${c.column_name}${optional ? "?" : ""}: ${type};`);
      }
      out("        };");
    }
    out("        Relationships: [");
    for (const fk of fks.filter((f) => f.table === table)) {
      out("          {");
      out(`            foreignKeyName: "${fk.name}";`);
      out(`            columns: [${fk.columns.map((c) => `"${c}"`).join(", ")}];`);
      out(`            isOneToOne: ${fk.one_to_one};`);
      out(`            referencedRelation: "${fk.ref_table}";`);
      out(`            referencedColumns: [${fk.ref_columns.map((c) => `"${c}"`).join(", ")}];`);
      out("          },");
    }
    out("        ];");
    out("      };");
  }
  out("    };");
  out("    Views: { [_ in never]: never };");
  out("    Functions: {");
  for (const fn of functions) {
    const args = (fn.args ?? "").split(",").filter(Boolean).map((a) => {
      const optional = a.endsWith("?");
      const [name, udt] = a.replace(/\?$/, "").split(":");
      return `${name}${optional ? "?" : ""}: ${pgType(udt)}`;
    });
    let returns: string;
    const table = fn.result.match(/^TABLE\((.*)\)$/);
    if (table) {
      const fields = table[1].split(",").map((f) => {
        const [name, ...type] = f.trim().split(" ");
        return `${name}: ${sqlToTs(type.join(" "))}`;
      });
      returns = `{ ${fields.join("; ")} }[]`;
    } else {
      returns = sqlToTs(fn.result) + (fn.returns_set ? "[]" : "");
    }
    out(`      ${fn.name}: { Args: ${args.length ? `{ ${args.join("; ")} }` : "never"}; Returns: ${returns} };`);
  }
  out("    };");
  out("    Enums: {");
  for (const [name, values] of enumValues) out(`      ${name}: ${values.map((v) => `"${v}"`).join(" | ")};`);
  out("    };");
  out("    CompositeTypes: { [_ in never]: never };");
  out("  };");
  out("};");
  out();
  out('type PublicSchema = Database["public"];');
  out('export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];');
  out('export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];');
  out('export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];');
  out('export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];');
  out();

  fs.writeFileSync(OUT, lines.join("\n"));
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}: ${tables.length} tables, ${functions.length} functions, ${enumValues.size} enums.`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
