import { routes } from "@/lib/routes";

// Navigation from the information architecture in CLAUDE.md.
// There is no Track Order and no account link anywhere.

export type NavLink = { label: string; href: string };

export const CATEGORY_LINKS: NavLink[] = [
  { label: "Earrings", href: routes.collection("earrings") },
  { label: "Necklace Sets", href: routes.collection("necklace-sets") },
  { label: "Rings", href: routes.collection("rings") },
  { label: "Bracelets", href: routes.collection("bracelets") },
  { label: "Pendants", href: routes.collection("pendants") },
];

export const DISCOVER_LINKS: NavLink[] = [
  { label: "New Arrivals", href: routes.newArrivals },
  { label: "Best Sellers", href: routes.bestSellers },
  { label: "Gifts for Her", href: routes.giftsForHer },
];

export const STYLE_LINKS: NavLink[] = [
  { label: "Studs", href: routes.style("studs") },
  { label: "Danglers", href: routes.style("danglers") },
  { label: "Jhumkas & Chaandbaalis", href: routes.style("jhumkas", "chaandbaalis") },
  { label: "Chokers", href: routes.style("choker") },
  { label: "Pearl", href: routes.style("pearl") },
  { label: "Minimal", href: routes.style("minimal") },
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
