"use server";

import { z } from "zod";

import { adminAction, check } from "@/lib/admin/action";
import { createAdminClient } from "@/lib/supabase/admin";

const input = z.object({
  threshold: z.coerce.number({ error: "Enter a whole number." }).int("Enter a whole number.").min(0, "It can't be negative.").max(1000, "That's too high."),
});

/** "Low stock" = this many pieces or fewer (shown on the dashboard and in Analytics). */
export const saveLowStockThreshold = adminAction({ schema: input }, async ({ threshold }) => {
  check(await createAdminClient().from("site_settings").update({ low_stock_threshold: threshold }).eq("id", 1), "settings");
  return { message: `Low stock now means ${threshold} or fewer.` };
});
