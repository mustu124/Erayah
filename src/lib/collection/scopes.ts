// What a collection page lists: Shop All, a category, a curated list or a style.

export type ListSlug = "new-arrivals" | "best-sellers" | "gifts-for-her";

/** Serializable description of a collection (passed into cached queries). */
export type Scope = {
  key: string;
  path: string;
  title: string;
  description: string | null;
  seoTitle: string;
  seoDescription: string;
  /** Category slug when the page is one category. */
  category: string | null;
  list: ListSlug | null;
  /** Products having any of these styles. */
  styles: string[] | null;
  comingSoon: boolean;
  showCategoryFilter: boolean;
  showGiftFilter: boolean;
  /** lifestyle_tiles.category_id to read: a category slug, or null for the Shop All tiles. */
  tileCategory: string | null;
  /** Lifestyle tiles between rows (not on search results). */
  allowTiles: boolean;
  /** Search results: only these products, in relevance order. */
  productIds: number[] | null;
  /** When true, the default ("curated") order is the order of productIds. */
  relevance: boolean;
};

const BASE = { allowTiles: true, productIds: null, relevance: false } as const;

export const LISTS: Record<ListSlug, { title: string; description: string; seoDescription: string }> = {
  "new-arrivals": {
    title: "New Arrivals",
    description: "The newest pieces from the Erayah studio.",
    seoDescription: "New handcrafted jewellery from Erayah: kundan, jadau and polki earrings, necklace sets, rings and pendants.",
  },
  "best-sellers": {
    title: "Best Sellers",
    description: "The pieces our customers return to.",
    seoDescription: "Erayah's most-loved handcrafted pieces in 22kt gold-plated silver alloy with polki, kundan and jadau.",
  },
  "gifts-for-her": {
    title: "Gifts for Her",
    description: "Pieces chosen for giving.",
    seoDescription: "Handcrafted jewellery gifts from Erayah: pendants and pieces under ₹3,000, with a gift note at checkout.",
  },
};

/** Style pages: /shop/style/<slug>. Most map to one style; some combine two. */
export const STYLE_PAGES: Record<string, { title: string; styles: string[]; description: string }> = {
  studs: { title: "Studs", styles: ["studs"], description: "Studs in polki and kundan, close to the ear." },
  danglers: { title: "Danglers", styles: ["danglers"], description: "Earrings that move as you do." },
  "jhumkas-chaandbaalis": {
    title: "Jhumkas & Chaandbaalis",
    styles: ["jhumkas", "chaandbaalis"],
    description: "Bell-shaped jhumkas and crescent chaandbaalis.",
  },
  jhumkas: { title: "Jhumkas", styles: ["jhumkas"], description: "Bell-shaped earrings in polki and faux pearls." },
  chaandbaalis: { title: "Chaandbaalis", styles: ["chaandbaalis"], description: "Crescent earrings in polki and faux pearls." },
  bali: { title: "Balis", styles: ["bali"], description: "Small hoops in polki." },
  "ear-cuffs": { title: "Ear Cuffs", styles: ["ear cuff"], description: "Ear cuffs in polki." },
  "shoulder-drops": { title: "Shoulder Drops", styles: ["shoulder drops"], description: "Long earrings for grand occasions." },
  chokers: { title: "Chokers", styles: ["choker"], description: "Chokers with their earrings, tied with a traditional dori." },
  stackable: { title: "Stackable", styles: ["stackable"], description: "Slim bands made to be worn together." },
  pearl: { title: "Pearl", styles: ["pearl"], description: "Pieces finished with faux pearls." },
  "mother-of-pearl": { title: "Mother-of-Pearl", styles: ["mother-of-pearl"], description: "Pieces in faux mother-of-pearl." },
  minimal: { title: "Minimal", styles: ["minimal"], description: "Quiet pieces for every day." },
  polki: { title: "Polki", styles: ["polki"], description: "Pieces set with polki stones." },
  statement: { title: "Statement", styles: ["statement"], description: "Pieces for the occasions you will remember." },
  celestial: { title: "Celestial", styles: ["celestial"], description: "Moons and stars in polki and mother-of-pearl." },
  nature: { title: "Nature", styles: ["nature"], description: "Flowers, lotuses, leaves and birds." },
};

/** One line under the category title, used when the category has no description set in admin. */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  earrings: "Jhumkas, chaandbaalis, danglers and studs in polki and kundan.",
  "necklace-sets": "Chokers and necklaces with their earrings, made to be worn together.",
  rings: "Adjustable rings in polki, from slim stacking bands to one-of-a-kind pieces.",
  pendants: "Elephants, moons, lotuses and wings on fine chains.",
};

export function shopAllScope(): Scope {
  return {
    key: "all",
    path: "/shop",
    title: "Shop All",
    description: "Every piece, handcrafted in 22kt gold-plated silver alloy.",
    seoTitle: "Shop All Jewellery",
    seoDescription: "Shop all Erayah jewellery: handcrafted kundan, jadau and polki earrings, necklace sets, rings and pendants.",
    category: null,
    list: null,
    styles: null,
    comingSoon: false,
    showCategoryFilter: true,
    showGiftFilter: true,
    tileCategory: null,
    ...BASE,
  };
}

export function listScope(slug: ListSlug): Scope {
  const list = LISTS[slug];
  return {
    key: `list:${slug}`,
    path: `/shop/${slug}`,
    title: list.title,
    description: list.description,
    seoTitle: list.title,
    seoDescription: list.seoDescription,
    category: null,
    list: slug,
    styles: null,
    comingSoon: false,
    showCategoryFilter: true,
    showGiftFilter: slug !== "gifts-for-her",
    tileCategory: null,
    ...BASE,
  };
}

export function styleScope(slug: string): Scope | null {
  const page = STYLE_PAGES[slug];
  if (!page) return null;
  return {
    key: `style:${slug}`,
    path: `/shop/style/${slug}`,
    title: page.title,
    description: page.description,
    seoTitle: `${page.title} Jewellery`,
    seoDescription: `${page.title} by Erayah: ${page.description.charAt(0).toLowerCase()}${page.description.slice(1)} Handcrafted in 22kt gold-plated silver alloy.`,
    category: null,
    list: null,
    styles: page.styles,
    comingSoon: false,
    showCategoryFilter: true,
    showGiftFilter: true,
    tileCategory: null,
    ...BASE,
  };
}

/** Search results for q: the matching products (best first), filterable like a collection. */
export function searchScope(q: string, productIds: number[]): Scope {
  return {
    key: `search:${q}`,
    path: `/search?q=${encodeURIComponent(q)}`,
    title: "Search",
    description: null,
    seoTitle: "Search",
    seoDescription: "Search Erayah jewellery.",
    category: null,
    list: null,
    styles: null,
    comingSoon: false,
    showCategoryFilter: true,
    showGiftFilter: true,
    tileCategory: null,
    allowTiles: false,
    productIds,
    relevance: true,
  };
}

export function isListSlug(slug: string): slug is ListSlug {
  return slug in LISTS;
}
