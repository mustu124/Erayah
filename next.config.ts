import type { NextConfig } from "next";

import { parseEnv, serverEnvSchema } from "./src/lib/env/schema";

// Fail loudly on `next dev` / `next build` if any env var is missing.
const env = parseEnv(serverEnvSchema, process.env);

const supabaseHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
