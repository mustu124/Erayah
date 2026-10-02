import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";

/**
 * Cookie-free anon client for public storefront reads inside "use cache"
 * functions. RLS limits it to what any visitor may see.
 */
export function createPublicClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
