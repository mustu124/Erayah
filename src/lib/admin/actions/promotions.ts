"use server";

import { z } from "zod";

import { adminAction, AdminError, check, optionalText, rupees } from "@/lib/admin/action";
import { istDateToIso } from "@/lib/admin/time";
import { createAdminClient } from "@/lib/supabase/admin";

const cardInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{6,32}$/, "Use 6–32 letters, numbers or dashes."),
  amount: rupees.refine((p) => p >= 100, "The amount must be at least ₹1."),
  expiresOn: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? istDateToIso(v, true) : null)),
  note: optionalText(200),
});

export const createGiftCard = adminAction({ role: "owner", schema: cardInput }, async ({ code, amount, expiresOn, note }) => {
  const db = createAdminClient();
  const clash = check(await db.from("gift_cards").select("id").ilike("code", code).maybeSingle(), "gift card");
  if (clash) throw new AdminError("A gift card with this code already exists.");
  check(await db.from("gift_cards").insert({ code, initial_balance: amount, balance: amount, expires_at: expiresOn, note }), "gift card");
  return { message: `Gift card ${code} created.` };
});

export const setGiftCardActive = adminAction(
  { role: "owner", schema: z.object({ id: z.number().int().positive(), active: z.boolean() }) },
  async ({ id, active }) => {
    check(await createAdminClient().from("gift_cards").update({ is_active: active }).eq("id", id), "gift card");
    return { message: active ? "Gift card reactivated." : "Gift card deactivated. It can't be used at checkout." };
  },
);
