// Cache tags for "use cache" data. Admin server actions call
// revalidateTag(TAGS.x, "max") after editing the matching table.

export const TAGS = {
  siteSettings: "site-settings",
  heroSlides: "hero-slides",
  categories: "categories",
  products: "products",
  pages: "pages",
  faqs: "faqs",
} as const;
