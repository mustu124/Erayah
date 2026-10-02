// Every storefront URL in one place. Collections cover categories and the
// curated lists; styles filter Shop All.

export const routes = {
  home: "/",
  shopAll: "/collections/all",
  collection: (slug: string) => `/collections/${slug}`,
  newArrivals: "/collections/new-arrivals",
  bestSellers: "/collections/best-sellers",
  giftsForHer: "/collections/gifts-for-her",
  style: (...styles: string[]) => `/collections/all?style=${encodeURIComponent(styles.join(","))}`,
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
