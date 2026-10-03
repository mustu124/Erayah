"use server";

import { z } from "zod";

import { adminAction, AdminError, check, rupees } from "@/lib/admin/action";
import { requireAdmin } from "@/lib/admin/auth";
import { INDIAN_STATES } from "@/lib/checkout/states";
import { createAdminClient } from "@/lib/supabase/admin";

const ruleInput = z
  .object({
    id: z.number().int().positive().nullable(),
    name: z.string().trim().min(2, "Give the rule a name.").max(80),
    matchType: z.enum(["default", "state", "pincode_prefix"]),
    matchValue: z.string().trim().max(60).nullish(),
    rate: rupees,
    freeAbove: rupees.nullable(),
    estDaysMin: z.coerce.number().int().min(1).max(60),
    estDaysMax: z.coerce.number().int().min(1).max(60),
    priority: z.coerce.number().int().min(-100).max(100),
    isActive: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (r.estDaysMax < r.estDaysMin) ctx.addIssue({ code: "custom", path: ["estDaysMax"], message: "The latest day can't be before the earliest." });
    if (r.matchType === "state" && !INDIAN_STATES.includes(r.matchValue as never)) ctx.addIssue({ code: "custom", path: ["matchValue"], message: "Choose a state." });
    if (r.matchType === "pincode_prefix" && !/^\d{1,6}$/.test(r.matchValue ?? "")) ctx.addIssue({ code: "custom", path: ["matchValue"], message: "Enter the first 1–6 digits of the pincode, e.g. 400 for Mumbai." });
    if (r.freeAbove === 0) ctx.addIssue({ code: "custom", path: ["freeAbove"], message: "Leave empty for no free shipping." });
  });

export const saveShippingRule = adminAction({ role: "owner", schema: ruleInput }, async (r) => {
  const db = createAdminClient();
  const row = {
    name: r.name,
    match_type: r.matchType,
    match_value: r.matchType === "default" ? null : r.matchValue!,
    rate: r.rate,
    free_above: r.freeAbove,
    est_days_min: r.estDaysMin,
    est_days_max: r.estDaysMax,
    priority: r.priority,
    is_active: r.isActive,
  };
  if (r.id) check(await db.from("shipping_rules").update(row).eq("id", r.id), "shipping rule");
  else check(await db.from("shipping_rules").insert(row), "shipping rule");
  await ensureDefault();
  return { message: r.id ? "Shipping rule saved." : "Shipping rule added." };
});

export const deleteShippingRule = adminAction({ role: "owner", schema: z.object({ id: z.number().int().positive() }) }, async ({ id }) => {
  const db = createAdminClient();
  const rule = check(await db.from("shipping_rules").select("match_type").eq("id", id).single(), "shipping rule");
  if (rule.match_type === "default") {
    const { count } = await db.from("shipping_rules").select("id", { count: "exact", head: true }).eq("match_type", "default").eq("is_active", true);
    if ((count ?? 0) <= 1) throw new AdminError("Keep one default rule: it covers every pincode without its own rule.");
  }
  check(await db.from("shipping_rules").delete().eq("id", id), "shipping rule");
  return { message: "Shipping rule removed." };
});

/** Without an active default rule, checkout can't price pincodes that match nothing. */
async function ensureDefault() {
  const { count } = await createAdminClient().from("shipping_rules").select("id", { count: "exact", head: true }).eq("match_type", "default").eq("is_active", true);
  if (!count) throw new AdminError("Saved, but there's no active default rule now. Turn one on so every pincode has a price.");
}

export async function testShippingQuote(input: { pincode: string; state: string; cartValue: string }) {
  await requireAdmin("owner");
  const pincode = input.pincode.trim();
  if (!/^[1-9]\d{5}$/.test(pincode)) return { error: "Enter a 6-digit pincode." };
  const value = Math.round(Number(input.cartValue.replace(/[₹,\s]/g, "")) * 100);
  if (!Number.isFinite(value) || value < 0) return { error: "Enter the cart value in rupees." };
  const db = createAdminClient();
  const { data, error } = await db.rpc("quote_shipping", { p_pincode: pincode, p_state: input.state, p_order_value: value });
  if (error) return { error: "Couldn't check that just now." };
  const match = data?.[0];
  if (!match) return { error: "No rule applies, so checkout would refuse this pincode. Add a default rule." };
  const { data: rule } = await db.from("shipping_rules").select("name, match_type, match_value, free_above").eq("id", match.rule_id).single();
  return { fee: match.fee, estDaysMin: match.est_days_min, estDaysMax: match.est_days_max, rule };
}
