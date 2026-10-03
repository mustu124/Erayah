import "server-only";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { fieldErrors } from "@/lib/checkout/schema";

import { type Admin, AdminAuthError, type AdminRole, requireAdmin } from "./auth";

// Shape every admin server action returns, so the client can show a toast.
export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> };

type Options<S extends z.ZodType> = {
  role?: AdminRole;
  schema: S;
  /** Storefront cache tags to expire after a successful save. */
  tags?: (input: z.output<S>) => string[];
};

/**
 * Wraps an admin action: checks the role, validates input with zod, runs it,
 * expires the given storefront tags, refreshes the admin page, and turns
 * errors into a message the owner can read.
 */
export function adminAction<S extends z.ZodType, T = undefined>(
  { role = "staff", schema, tags }: Options<S>,
  run: (input: z.output<S>, admin: Admin) => Promise<{ message: string; data?: T }>,
) {
  return async (raw: z.input<S>): Promise<ActionResult<T>> => {
    try {
      const admin = await requireAdmin(role);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const fields = fieldErrors(parsed.error);
        return { ok: false, error: Object.values(fields)[0] ?? "Please check the form.", fields };
      }
      const result = await run(parsed.data, admin);
      for (const tag of tags?.(parsed.data) ?? []) updateTag(tag);
      refresh();
      return { ok: true, message: result.message, data: result.data };
    } catch (error) {
      if (error instanceof AdminAuthError || error instanceof AdminError) return { ok: false, error: error.message };
      console.error("admin action:", error);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };
}

/** Throw inside an action to show this message to the owner. */
export class AdminError extends Error {}

/** Throws an AdminError with a readable message for a Supabase error. */
export function check<R extends { data: unknown; error: { message: string; code?: string } | null }>(result: R, what: string): NonNullable<R["data"]> {
  if (result.error) {
    if (result.error.code === "23505") throw new AdminError(`That ${what} already exists.`);
    if (result.error.code === "23514") throw new AdminError(`Some ${what} details aren't allowed. Please check them.`);
    console.error(what, result.error);
    throw new Error(`${what}: ${result.error.message}`);
  }
  return result.data as NonNullable<R["data"]>;
}

/** "₹2,350" or "2350" from a form → paise. */
export const rupees = z.coerce
  .number({ error: "Please enter an amount in rupees." })
  .min(0, "Amounts can't be negative.")
  .max(10_000_000, "That amount is too large.")
  .transform((r) => Math.round(r * 100));

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
