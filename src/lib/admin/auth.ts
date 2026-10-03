import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// The admin data-access gate. Every /admin page calls requireAdminPage() and
// every admin server action calls requireAdmin(); both check the signed-in
// Supabase user against admin_users (the same rule as the database's
// is_admin()), so the proxy's redirect is only a convenience.

export type AdminRole = "owner" | "staff";
export type Admin = { userId: string; email: string; role: AdminRole };

/** The signed-in admin for this request, or null (not signed in / not an admin). */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: row } = await createAdminClient()
    .from("admin_users")
    .select("role, email")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!row) return null;
  return { userId: data.user.id, email: row.email, role: row.role };
});

/** For pages: redirects to the login page (or the dashboard, for a staff member on an owner page). */
export async function requireAdminPage(role: AdminRole = "staff"): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "owner" && admin.role !== "owner") redirect("/admin?denied=1");
  return admin;
}

export class AdminAuthError extends Error {}

/** For server actions and route handlers: throws unless the caller is an admin (of the given role). */
export async function requireAdmin(role: AdminRole = "staff"): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAuthError("Please sign in again.");
  if (role === "owner" && admin.role !== "owner") throw new AdminAuthError("Only the owner can do this.");
  return admin;
}
