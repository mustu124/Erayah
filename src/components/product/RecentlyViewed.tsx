"use client";

import { useEffect, useState } from "react";

import { Carousel } from "@/components/ui/Carousel";
import type { ProductCardData } from "@/lib/data/catalog";
import { useHydrated } from "@/lib/use-hydrated";
import { useRecentlyViewed } from "@/stores/recently-viewed";

import { ProductCard } from "./ProductCard";

const CARD_SIZES = "(min-width: 1024px) 19vw, (min-width: 768px) 31vw, 60vw";

/** The shopper's last viewed pieces (this device only), excluding the current one. Hidden when empty. */
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const hydrated = useHydrated();
  const slugs = useRecentlyViewed((s) => s.slugs);
  const wanted = hydrated ? slugs.filter((s) => s !== currentSlug).slice(0, 10) : [];
  const key = wanted.join(",");
  const [cards, setCards] = useState<{ key: string; items: ProductCardData[] }>({ key: "", items: [] });

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/products/cards?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<ProductCardData[]>) : []))
      .then((items) => setCards({ key, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  const items = key && cards.key === key ? cards.items : [];
  if (!items.length) return null;

  return (
    <section aria-labelledby="recently-viewed" className="py-14 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10">
        <h2 id="recently-viewed" className="font-heading text-h3 text-ink md:text-h2">
          Recently Viewed
        </h2>
        <Carousel label="Recently viewed" slideClassName="basis-[62%] md:basis-1/3 lg:basis-1/5" className="mt-8">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} sizes={CARD_SIZES} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
