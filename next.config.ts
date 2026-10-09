import type { NextConfig } from "next";

import { parseEnv, serverEnvSchema } from "./src/lib/env/schema";

// Fail loudly on `next dev` / `next build` if any env var is missing.
const env = parseEnv(serverEnvSchema, process.env);

const supabaseHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;

const nextConfig: NextConfig = {
  // Next 16 caching: "use cache" + cacheTag in src/lib/data, revalidated by tag from /admin.
  cacheComponents: true,
  // The invoice PDF reads its fonts from disk; ship them with the routes that render it.
  outputFileTracingIncludes: {
    "/api/invoice/[number]": ["./src/fonts/**/*.ttf"],
    "/api/checkout/create": ["./src/fonts/**/*.ttf"],
    "/api/checkout/verify": ["./src/fonts/**/*.ttf"],
    "/api/webhooks/razorpay": ["./src/fonts/**/*.ttf"],
    "/admin/orders/[number]/invoice": ["./src/fonts/**/*.ttf"],
  },
  // "Best Sellers" became "Most Loved"; old links (Instagram, bookmarks) keep working.
  redirects: async () => [{ source: "/shop/best-sellers", destination: "/shop/most-loved", permanent: true }],
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
