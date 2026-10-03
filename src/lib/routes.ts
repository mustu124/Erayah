// Every storefront URL in one place. /shop is Shop All; /shop/<slug> covers
// categories and the curated lists; styles filter Shop All.

export const routes = {
  home: "/",
  shopAll: "/shop",
  collection: (slug: string) => `/shop/${slug}`,
  newArrivals: "/shop/new-arrivals",
  bestSellers: "/shop/best-sellers",
  giftsForHer: "/shop/gifts-for-her",
  style: (...styles: string[]) => `/shop?style=${encodeURIComponent(styles.join(","))}`,
  product: (slug: string) => `/products/${slug}`,
  search: "/search",
  wishlist: "/wishlist",
  about: "/about",
  contact: "/contact",
  faqs: "/faqs",
  shippingReturns: "/shipping-returns",
  privacyPolicy: "/privacy-policy",
  terms: "/terms",
} as const;
