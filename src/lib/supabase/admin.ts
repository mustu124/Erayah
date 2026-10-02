import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses RLS — use only in trusted server code
 * (webhooks, order creation, admin actions after an auth check).
 * `server-only` makes any import from a Client Component fail the build.
 */
export function createAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
