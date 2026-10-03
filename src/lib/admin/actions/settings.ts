"use server";

import { z } from "zod";

import { adminAction, check, optionalText } from "@/lib/admin/action";
import { TAGS } from "@/lib/cache-tags";
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
