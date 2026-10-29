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
  testimonials: "testimonials",
} as const;

/** One product's page (detail, Complete the Look). */
export const productTag = (slug: string) => `product:${slug}`;
