"use client";

import { ProductCard } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { ElephantMark } from "@/components/ui/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/use-hydrated";
import { useProductCards } from "@/lib/use-product-cards";
import { useWishlist } from "@/stores/wishlist";

const CARD_SIZES = "(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw";

/** The pieces saved on this device, newest first. Tapping a heart removes the piece. */
export function WishlistGrid() {
  const hydrated = useHydrated();
  const items = useWishlist((s) => s.items);
  const slugs = hydrated ? items.map((i) => i.slug).reverse() : [];
  const { cards, loading } = useProductCards(slugs);
  const products = slugs.flatMap((slug) => cards.get(slug) ?? []);

  if (!hydrated || (loading && !products.length)) {
    return (
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/5]" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="mt-14 flex flex-col items-center gap-6 text-center">
        <ElephantMark className="h-10 w-auto text-gold" />
        <p className="max-w-sm text-body text-ink/75">Nothing saved yet. Tap the heart on a piece and it will wait for you here.</p>
        <ButtonLink href={routes.shopAll}>Shop All</ButtonLink>
      </div>
    );
  }

  return (
    <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} sizes={CARD_SIZES} />
        </li>
      ))}
    </ul>
  );
}
