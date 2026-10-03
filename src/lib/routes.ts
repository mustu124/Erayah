// Every storefront URL in one place. /shop is Shop All; /shop/<slug> covers
// categories and the curated lists; /shop/style/<slug> the style pages
// (see STYLE_PAGES in src/lib/collection/scopes.ts).

export const routes = {
  home: "/",
  shopAll: "/shop",
  collection: (slug: string) => `/shop/${slug}`,
  newArrivals: "/shop/new-arrivals",
  bestSellers: "/shop/best-sellers",
  giftsForHer: "/shop/gifts-for-her",
  style: (slug: string) => `/shop/style/${slug}`,
  product: (slug: string) => `/product/${slug}`,
  search: "/search",
  wishlist: "/wishlist",
  about: "/about",
  contact: "/contact",
  faqs: "/faqs",
  shippingReturns: "/shipping-returns",
  privacyPolicy: "/privacy-policy",
  terms: "/terms",
} as const;
