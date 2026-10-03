// Makes someone an Erayah admin (the first owner, usually).
//
//   pnpm create-admin owner@example.com            → owner
//   pnpm create-admin staff@example.com --staff    → staff
//
// If the email has no Supabase Auth account yet, one is created with a
// random password, printed once here; they can change it under "My account"
// or sign in with an email link instead. Safe to run again (it only
// updates the role).
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
const role = args.includes("--staff") ? "staff" : "owner";

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: pnpm create-admin <email> [--staff]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUser(address: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === address);
    if (user || data.users.length < 200) return user ?? null;
  }
  return null;
}

async function main() {
  let user = await findUser(email!);
  let password: string | null = null;
  if (!user) {
    password = randomBytes(12).toString("base64url");
    const { data, error } = await supabase.auth.admin.createUser({ email: email!, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await supabase.from("admin_users").upsert({ user_id: user.id, email: email!, role }, { onConflict: "user_id" });
  if (error) throw error;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  console.log(`\n✓ ${email} is now an Erayah ${role}.`);
  if (password) console.log(`  Temporary password (shown once): ${password}`);
  else console.log("  They already had an account: sign in with the existing password or an email link.");
  console.log(`  Sign in at ${site}/admin/login\n`);
}

main().catch((error) => {
  console.error("Couldn't create the admin:", error.message ?? error);
  process.exit(1);
});
