import type { MetadataRoute } from "next";

/**
 * Keep private and transactional pages out of search engines, and keep
 * crawlers off search results and filter/sort combinations: each is a page
 * render of its own, and an endless supply of them wastes server time.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/checkout",
        "/order/",
        "/api/",
        "/search",
        "/wishlist",
        "/*?*sort=",
        "/*?*min=",
        "/*?*max=",
        "/*?*availability=",
        "/*?*gift=",
        "/*?*category=",
        "/*?*colour=",
      ],
    },
    host: process.env.NEXT_PUBLIC_SITE_URL,
  };
}
