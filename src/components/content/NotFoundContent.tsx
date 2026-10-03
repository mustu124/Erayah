import { Suspense } from "react";

import { ProductCarouselSection } from "@/app/(store)/_components/ProductCarouselSection";
import { SearchForm } from "@/components/layout/SearchForm";
import { ButtonLink } from "@/components/ui/Button";
import { ElephantMark } from "@/components/ui/Logo";
import { getBestSellers } from "@/lib/data/catalog";
import { routes } from "@/lib/routes";

/** "This piece seems to have wandered off." with search and Best Sellers. */
export function NotFoundContent() {
  return (
    <>
      <section className="px-4 pt-16 pb-10 text-center lg:pt-24">
        <ElephantMark className="mx-auto h-12 w-auto text-gold" />
        <h1 className="mx-auto mt-8 max-w-2xl font-heading text-[32px] leading-[1.2] text-ink lg:text-[48px]">This piece seems to have wandered off.</h1>
        <p className="mx-auto mt-4 max-w-md text-body-lg text-ink/75">The page you were looking for isn&apos;t here. Try a search, or find something new below.</p>
        <div className="mx-auto mt-8 max-w-md text-left">
          <SearchForm id="not-found-search" />
        </div>
        <ButtonLink href={routes.shopAll} variant="link" className="mt-4">
          Shop All
        </ButtonLink>
      </section>
      <Suspense>
        <BestSellers />
      </Suspense>
    </>
  );
}

async function BestSellers() {
  return <ProductCarouselSection id="not-found-best-sellers" title="Best Sellers" products={await getBestSellers()} href={routes.bestSellers} linkLabel="Shop All Best Sellers" />;
}
