"use server";

import { z } from "zod";

import { adminAction, AdminError, check, optionalText } from "@/lib/admin/action";
import { TAGS } from "@/lib/cache-tags";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const settingsInput = z.object({
  businessName: z.string().trim().min(2, "Enter the business name.").max(120),
  businessAddress: optionalText(400),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(|[0-9A-Z]{15})$/, "A GSTIN has 15 letters and numbers.")
    .transform((v) => v || null),
  gstRate: z.coerce.number().min(0).max(28),
  pricesIncludeGst: z.boolean(),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,5}$/, "1–5 capital letters or numbers."),
  whatsappNumber: z
    .string()
    .transform((v) => v.replace(/[\s+\-()]/g, ""))
    .pipe(z.string().regex(/^(|\d{10,15})$/, "Digits with country code, e.g. 919876543210."))
    .transform((v) => (v.length === 10 ? `91${v}` : v) || null),
  supportEmail: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email.")
    .transform((v) => v || null),
  supportPhone: optionalText(30),
  businessHours: optionalText(120),
  instagramUrl: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^https:\/\/(www\.)?instagram\.com\//.test(v), "Use the full link, e.g. https://www.instagram.com/erayah")
    .transform((v) => v || null),
});

export const saveSettings = adminAction({ role: "owner", schema: settingsInput, tags: () => [TAGS.siteSettings, TAGS.home] }, async (s) => {
  check(
    await createAdminClient()
      .from("site_settings")
      .update({
        business_name: s.businessName,
        business_address: s.businessAddress,
        gstin: s.gstin,
        gst_rate: s.gstRate,
        prices_include_gst: s.pricesIncludeGst,
        invoice_prefix: s.invoicePrefix,
        whatsapp_number: s.whatsappNumber,
        support_email: s.supportEmail,
        support_phone: s.supportPhone,
        business_hours: s.businessHours,
        instagram_url: s.instagramUrl,
      })
      .eq("id", 1),
    "settings",
  );
  return { message: "Settings saved." };
});

// ─── Admin users ───────────────────────────────────────────────────────────

const inviteInput = z.object({ email: z.email("Enter an email address.").trim().toLowerCase(), role: z.enum(["owner", "staff"]) });

async function findUserId(email: string) {
  const db = createAdminClient();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Sends a Supabase invitation email (or adds an existing account) and grants the role. */
export const inviteAdmin = adminAction({ role: "owner", schema: inviteInput }, async ({ email, role }) => {
  const db = createAdminClient();
  let userId = await findUserId(email);
  let invited = false;
  if (!userId) {
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: new URL("/admin/auth/callback", env.NEXT_PUBLIC_SITE_URL).toString() });
    if (error) throw new AdminError(error.message.includes("rate") ? "Too many invitations just now. Try again in a minute." : "Couldn't send the invitation. Check the address.");
    userId = data.user.id;
    invited = true;
  }
  check(await db.from("admin_users").upsert({ user_id: userId, email, role }, { onConflict: "user_id" }), "admin");
  return { message: invited ? `Invitation sent to ${email}.` : `${email} can now sign in as ${role}.` };
});

const userInput = z.object({ userId: z.uuid() });

async function ownerCount() {
  const { count } = await createAdminClient().from("admin_users").select("user_id", { count: "exact", head: true }).eq("role", "owner");
  return count ?? 0;
}

export const setAdminRole = adminAction({ role: "owner", schema: userInput.extend({ role: z.enum(["owner", "staff"]) }) }, async ({ userId, role }, me) => {
  if (userId === me.userId && role !== "owner") throw new AdminError("You can't remove your own owner access. Ask another owner.");
  if (role === "staff" && (await ownerCount()) <= 1) throw new AdminError("There must always be at least one owner.");
  check(await createAdminClient().from("admin_users").update({ role }).eq("user_id", userId), "admin");
  return { message: `Role changed to ${role}.` };
});

export const removeAdmin = adminAction({ role: "owner", schema: userInput }, async ({ userId }, me) => {
  if (userId === me.userId) throw new AdminError("You can't remove yourself.");
  const db = createAdminClient();
  const row = check(await db.from("admin_users").select("role").eq("user_id", userId).single(), "admin");
  if (row.role === "owner" && (await ownerCount()) <= 1) throw new AdminError("There must always be at least one owner.");
  check(await db.from("admin_users").delete().eq("user_id", userId), "admin");
  return { message: "Access removed. They can no longer open the admin." };
});
