"use client";

import { useEffect, useState } from "react";

import type { ProductCardData } from "@/lib/data/catalog";

/**
 * Card data (name, price, image) for products the shopper holds only as slugs
 * in localStorage: the cart, the wishlist. `loading` is true until the first
 * answer for the current set of slugs.
 */
export function useProductCards(slugs: string[]): { cards: Map<string, ProductCardData>; loading: boolean } {
  const key = [...new Set(slugs)].sort().join(",");
  const [state, setState] = useState<{ key: string; cards: Map<string, ProductCardData> }>({ key: "", cards: new Map() });

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/products/cards?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<ProductCardData[]>) : []))
      .then((items) => setState({ key, cards: new Map(items.map((c) => [c.slug, c])) }))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  // While a changed set loads, keep showing what is already known.
  return { cards: state.cards, loading: !!key && state.key !== key };
}
