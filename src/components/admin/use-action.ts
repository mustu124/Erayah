"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/admin/action";

/**
 * Runs an admin server action with a pending flag and a toast for the result.
 * Returns the result so callers can read `fields` (per-field errors) or `data`.
 */
export function useAdminAction<I, T = undefined>(action: (input: I) => Promise<ActionResult<T>>) {
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState<Record<string, string>>({});

  const run = (input: I, opts: { quiet?: boolean } = {}) =>
    new Promise<ActionResult<T>>((resolve) => {
      startTransition(async () => {
        let result: ActionResult<T>;
        try {
          result = await action(input);
        } catch {
          result = { ok: false, error: "Couldn't reach the server. Please check your connection." };
        }
        if (result.ok) {
          setFields({});
          if (!opts.quiet) toast.success(result.message);
        } else {
          setFields(result.fields ?? {});
          toast.error(result.error);
        }
        resolve(result);
      });
    });

  return { run, pending, fields };
}
