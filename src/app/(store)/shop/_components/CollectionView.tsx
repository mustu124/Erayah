import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { hasActiveFilters, parseFilters } from "@/lib/collection/params";
import type { Scope } from "@/lib/collection/scopes";
import {
  getCategories,
  getCollectionPage,
  getConfiguredTiles,
  getFacets,
  getTileCandidates,
} from "@/lib/data/collection";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, jsonLdScript, type Crumb } from "@/lib/seo/jsonld";

import { ActiveFilters, NoResults } from "./ActiveFilters";
import { FilterPanel } from "./FilterPanel";
import { FilterProvider, PendingFade } from "./FilterProvider";
import { buildGridItems } from "./grid-items";
import { MobileFilterBar } from "./MobileFilterBar";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductGrid";
import { ScrollRestorer } from "./ScrollRestorer";
import { SortSelect } from "./SortSelect";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** A collection page: title, then filters, sort, grid and pagination (streamed). */
export function CollectionView({ scope, crumbs, searchParams }: { scope: Scope; crumbs: Crumb[]; searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-20 md:px-6 lg:px-10 lg:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      <header>
        <h1 className="font-heading text-h1 text-ink lg:text-[2.5rem] lg:leading-tight">{scope.title}</h1>
        {scope.description ? <p className="mt-2 max-w-xl text-body text-ink/75">{scope.description}</p> : null}
      </header>
      <Suspense fallback={<CollectionSkeleton />}>
        <CollectionBody scope={scope} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

export async function CollectionBody({ scope, searchParams }: { scope: Scope; searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const showTiles = scope.allowTiles && filters.sort === "curated" && !hasActiveFilters(filters);

  const [page, facets, categories, configured, candidates] = await Promise.all([
    getCollectionPage(scope, filters),
    getFacets(scope),
    getCategories(),
    showTiles ? getConfiguredTiles(scope) : Promise.resolve([]),
    showTiles ? getTileCandidates(scope) : Promise.resolve([]),
  ]);

  if (scope.comingSoon && facets.total === 0) return <ComingSoon title={scope.title} />;
  if (page.total > 0 && filters.page > page.pageCount) notFound();

  const items = buildGridItems({ products: page.products, page: filters.page, configured, candidates, showTiles });
  const categoryNames = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
  const countLabel = `${page.total} ${page.total === 1 ? "piece" : "pieces"}`;

  return (
    <FilterProvider path={scope.path} filters={filters} curatedLabel={scope.relevance ? "Relevance" : "Curated"}>
      <ScrollRestorer />
      <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside aria-labelledby="filters-heading" className="hidden lg:block">
          <h2 id="filters-heading" className="mb-6 font-heading text-h3 text-ink">
            Filters
          </h2>
          <FilterPanel scope={scope} facets={facets} />
        </aside>

        <div>
          <MobileFilterBar scope={scope} facets={facets} total={page.total} />
          <div className="mt-4 mb-5 flex min-h-11 items-center justify-between gap-4 lg:mt-0 lg:mb-6">
            <p className="text-body-sm text-ink/70" aria-live="polite">
              {countLabel}
            </p>
            <SortSelect className="hidden lg:flex" />
          </div>
          <ActiveFilters categoryNames={categoryNames} />

          <PendingFade className="mt-6">
            {page.total > 0 ? (
              <>
                <h2 className="sr-only">Products</h2>
                <ProductGrid items={items} />
                <Pagination path={scope.path} filters={filters} pageCount={page.pageCount} />
              </>
            ) : (
              <NoResults />
            )}
          </PendingFade>
        </div>
      </div>
    </FilterProvider>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <section className="mt-10 border-t border-mist py-24 text-center lg:py-32">
      <p className="mx-auto max-w-lg font-heading text-h2 text-ink lg:text-h1">
        {title} are being handcrafted. <span className="font-script italic">Coming soon.</span>
      </p>
      <p className="mt-8 flex justify-center gap-8 text-body-sm">
        <Link href={routes.collection("earrings")} className="min-h-11 text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
          Shop Earrings
        </Link>
        <Link href={routes.collection("rings")} className="min-h-11 text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
          Shop Rings
        </Link>
      </p>
    </section>
  );
}

export function CollectionSkeleton() {
  return (
    <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
      <div className="hidden space-y-6 lg:block">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-28" />
        <Skeleton className="h-32" />
      </div>
      <div>
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
        <Skeleton className="mt-5 h-5 w-24 lg:mt-0" />
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/5]" />
              <Skeleton className="mt-3 h-3 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Home › Shop › … */
export function shopCrumbs(scope: Scope): Crumb[] {
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Shop", path: routes.shopAll },
  ];
  return scope.path === routes.shopAll ? crumbs : [...crumbs, { name: scope.title, path: scope.path }];
}
