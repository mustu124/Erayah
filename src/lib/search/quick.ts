import { routes } from "@/lib/routes";

/** Chips shown in the search box before typing and when a search finds nothing. */
export const QUICK_SEARCHES = [
  { label: "Studs", href: routes.style("studs") },
  { label: "Jhumkas", href: routes.style("jhumkas") },
  { label: "Pearl", href: routes.style("pearl") },
  { label: "Minimal", href: routes.style("minimal") },
  { label: "Polki", href: routes.style("polki") },
  { label: "Necklace Sets", href: routes.collection("necklace-sets") },
] as const;
