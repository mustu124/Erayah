import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { getMerch, parseScope } from "@/lib/admin/merch";
import { listCategories } from "@/lib/admin/products";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

import { MerchGrid } from "./MerchGrid";
import { TileForm } from "./TileForm";

export const metadata: Metadata = { title: "Merchandising" };

export default async function MerchandisingPage({ searchParams }: PageProps<"/admin/merchandising">) {
  await requireAdminPage("owner");
  const categories = await listCategories();
  const raw = (await searchParams).scope;
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? String(categories[0]?.id ?? "");
  const scope = parseScope(value) ?? { kind: "category" as const, categoryId: categories[0].id };
  const { products, tiles } = await getMerch(scope);

  const options = [
    ...categories.map((c) => ({ value: String(c.id), label: c.name, href: routes.collection(c.slug) })),
    { value: "new-arrivals", label: "New Arrivals", href: routes.newArrivals },
    { value: "best-sellers", label: "Best Sellers", href: routes.bestSellers },
    { value: "shop-all", label: "Shop All", href: routes.shopAll },
  ];
  const current = options.find((o) => o.value === value) ?? options[0];
  const sortable = scope.kind !== "shop-all";
  const tilesHere = scope.kind !== "list";

  return (
    <>
      <PageHeader
        title="Merchandising"
        description="The order customers see when they choose “Curated”. Drag pieces, then save; the shop updates at once."
        actions={
          <a href={current.href} target="_blank" rel="noopener noreferrer" className="text-body-sm underline decoration-ink/30 underline-offset-4">
            View {current.label} in the shop ↗
          </a>
        }
      />
      <nav aria-label="Collections" className="mb-5 flex flex-wrap gap-2">
        {options.map((o) => (
          <Link
            key={o.value}
            href={`/admin/merchandising?scope=${o.value}`}
            aria-current={o.value === current.value ? "page" : undefined}
            className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-body-sm", o.value === current.value ? "border-ink bg-ink text-ivory" : "border-mist bg-paper hover:border-ink/40")}
          >
            {o.label}
          </Link>
        ))}
      </nav>

      {scope.kind === "list" ? (
        <p className="mb-4 text-body-sm text-ink/70">Pieces appear here when “{current.label}” is switched on in the product editor.</p>
      ) : null}
      {scope.kind === "shop-all" ? (
        <p className="mb-4 text-body-sm text-ink/70">Shop All mixes each category&apos;s order (every category&apos;s first pick, then the second…). Reorder a category to change it. Lifestyle tiles for Shop All are placed by number below.</p>
      ) : null}

      <MerchGrid key={value} scope={value} products={products} tiles={tiles} sortable={sortable} />

      {tilesHere ? (
        <div className="mt-8 space-y-4">
          <Panel title="Add a lifestyle tile">
            <TileForm categoryId={scope.kind === "category" ? scope.categoryId : null} defaultAfter={Math.min(8, products.length)} showPosition={!sortable} />
          </Panel>
          {tiles.map((t) => (
            <Panel key={t.id} title={`Tile${t.caption ? `: ${t.caption}` : ""}`}>
              <TileForm categoryId={scope.kind === "category" ? scope.categoryId : null} tile={t} defaultAfter={t.insertAfter} showPosition={!sortable} />
            </Panel>
          ))}
        </div>
      ) : null}
    </>
  );
}
