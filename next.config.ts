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
    // WebP only, and a short list of widths: every format × width is a separate
    // transformation (and a separate fetch of the original from Supabase Storage).
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1440, 1920],
    imageSizes: [96, 256, 384],
    // Storage paths are content-hashed (a new photo gets a new URL), so an
    // optimised image never goes stale: keep it 31 days instead of re-fetching.
    minimumCacheTTL: 2678400,
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
