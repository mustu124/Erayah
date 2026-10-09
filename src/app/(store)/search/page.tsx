import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";

import { searchScope } from "@/lib/collection/scopes";
import { getBestSellers } from "@/lib/data/catalog";
import { logSearchMiss, searchProductIds } from "@/lib/data/search";
import { routes } from "@/lib/routes";
import { QUICK_SEARCHES } from "@/lib/search/quick";
import { normaliseQuery } from "@/lib/search/synonyms";

import { ProductCarouselSection } from "../_components/ProductCarouselSection";
import { CollectionBody, CollectionSkeleton } from "../shop/_components/CollectionView";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

type SearchParams = Record<string, string | string[] | undefined>;

/** /search?q=… — the collection grid, filters, sort and pagination for matching pieces. */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-20 md:px-6 lg:px-10 lg:pt-12">
      <Suspense fallback={<CollectionSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : (params.q ?? "")).trim().slice(0, 80);

  if (!normaliseQuery(q)) {
    return (
      <>
        <h1 className="font-heading text-h1 text-ink lg:text-[2.5rem]">Search</h1>
        <p className="mt-3 text-body text-ink/75">What are you looking for?</p>
        <QuickChips className="mt-6" />
      </>
    );
  }

  const ids = await searchProductIds(q);
  const heading = (
    <header>
      <p className="text-[11px] font-medium tracking-[0.14em] text-ink/70 uppercase">Search results for</p>
      <h1 className="mt-1 font-heading text-h1 text-ink lg:text-[2.5rem]">“{q}”</h1>
    </header>
  );

  if (!ids.length) {
    after(() => logSearchMiss(q));
    return (
      <>
        {heading}
        <section className="py-16 text-center lg:py-20">
          <p className="font-heading text-h2 text-ink">We couldn’t find that piece</p>
          <p className="mt-3 text-body text-ink/75">Try another word, or begin with one of these.</p>
          <QuickChips className="mt-8 justify-center" />
        </section>
        <div className="-mx-4 md:-mx-6 lg:-mx-10">
          <NoResultsBestSellers />
        </div>
      </>
    );
  }

  return (
    <>
      {heading}
      <CollectionBody scope={searchScope(q, ids)} searchParams={Promise.resolve(params)} />
    </>
  );
}

async function NoResultsBestSellers() {
  return (
    <ProductCarouselSection
      id="search-most-loved"
      title="Most Loved"
      products={await getBestSellers()}
      href={routes.mostLoved}
      linkLabel="Shop All Most Loved"
    />
  );
}

function QuickChips({ className }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {QUICK_SEARCHES.map((chip) => (
        <li key={chip.href}>
          <Link
            href={chip.href}
            className="flex min-h-11 items-center rounded-full border border-mist bg-paper px-5 text-body-sm text-ink transition-colors duration-300 hover:border-ink"
          >
            {chip.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
