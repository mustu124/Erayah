import { publicEnv } from "@/lib/env/public";

export type PublicBucket = "product-images" | "site-media";

/** Public URL of a file in a public storage bucket. */
export function publicStorageUrl(bucket: PublicBucket, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}
