import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";

/** Supabase client for Client Components. Uses the anon key; RLS applies. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
