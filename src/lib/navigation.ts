import { routes } from "@/lib/routes";

// Navigation from the information architecture in CLAUDE.md.
// There is no Track Order and no account link anywhere.

export type NavLink = { label: string; href: string };

export const CATEGORY_LINKS: NavLink[] = [
  { label: "Earrings", href: routes.collection("earrings") },
  { label: "Necklace Set", href: routes.collection("necklace-sets") },
  { label: "Rings", href: routes.collection("rings") },
  { label: "Bracelets", href: routes.collection("bracelets") },
  { label: "Pendants", href: routes.collection("pendants") },
];

export const DISCOVER_LINKS: NavLink[] = [
  { label: "New Arrivals", href: routes.newArrivals },
  { label: "Most Loved", href: routes.mostLoved },
  { label: "Gifts for Her (Under ₹3K)", href: routes.giftsForHer },
];

/** Subcategories shown under Earrings and Necklace Set in the Shop menu. */
export const SUBCATEGORY_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Earrings",
    links: [
      { label: "All Earrings", href: routes.collection("earrings") },
      { label: "Studs", href: routes.subcategory("earrings", "studs") },
      { label: "Danglers", href: routes.subcategory("earrings", "danglers") },
      { label: "Jhumkas", href: routes.subcategory("earrings", "jhumkas") },
      { label: "Chaandbaalis", href: routes.subcategory("earrings", "chaandbaalis") },
      { label: "Balis", href: routes.subcategory("earrings", "bali") },
      { label: "Ear Cuffs", href: routes.subcategory("earrings", "ear cuff") },
      { label: "Shoulder Drops", href: routes.subcategory("earrings", "shoulder drops") },
    ],
  },
  {
    title: "Necklace Set",
    links: [
      { label: "All Necklace Sets", href: routes.collection("necklace-sets") },
      { label: "Chokers", href: routes.subcategory("necklace-sets", "choker") },
      { label: "Long Necklace Sets", href: routes.subcategory("necklace-sets", "necklace set") },
    ],
  },
];

/** The categories without subcategories, then Shop All. */
export const MORE_CATEGORY_LINKS: NavLink[] = [
  { label: "Rings", href: routes.collection("rings") },
  { label: "Bracelets", href: routes.collection("bracelets") },
  { label: "Pendants", href: routes.collection("pendants") },
  { label: "Shop All", href: routes.shopAll },
];

export const PRIMARY_LINKS: NavLink[] = [
  { label: "About", href: routes.about },
  { label: "Contact", href: routes.contact },
  { label: "FAQs", href: routes.faqs },
];

export const FOOTER_HELP_LINKS: NavLink[] = [
  { label: "Contact", href: routes.contact },
  { label: "FAQs", href: routes.faqs },
  { label: "Shipping & Returns", href: routes.shippingReturns },
];

export const FOOTER_ERAYAH_LINKS: NavLink[] = [
  { label: "About Erayah", href: routes.about },
  { label: "Privacy Policy", href: routes.privacyPolicy },
  { label: "Terms & Conditions", href: routes.terms },
];
