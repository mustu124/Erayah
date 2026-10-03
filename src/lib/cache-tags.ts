// Cache tags for "use cache" data. Admin server actions call
// revalidateTag(TAGS.x, "max") after editing the matching table.

export const TAGS = {
  home: "home",
  siteSettings: "site-settings",
  heroSlides: "hero-slides",
  lifestyleTiles: "lifestyle-tiles",
  categories: "categories",
  products: "products",
  pages: "pages",
  faqs: "faqs",
} as const;
