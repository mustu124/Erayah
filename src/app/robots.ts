import type { MetadataRoute } from "next";

/** Keep private and transactional pages out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/order/", "/api/"] },
    host: process.env.NEXT_PUBLIC_SITE_URL,
  };
}
