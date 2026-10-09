import Image from "next/image";
import Link from "next/link";

import { ElephantMark } from "@/components/ui/Logo";
import { getCategoryTiles, type CategoryTile } from "@/lib/data/catalog";
import { routes } from "@/lib/routes";

import { GiantWordmark } from "./GiantWordmark";

const SIZES = "(min-width: 1024px) 280px, (min-width: 768px) 30vw, 31vw";

/** Five categories plus Shop All: a complete 3-column grid over a faint ERAYAH. */
export async function ShopByCategory() {
  const categories = await getCategoryTiles();
  const tiles: CategoryTile[] = [
    ...categories,
    { slug: "all", name: "Shop All", href: routes.shopAll, comingSoon: false, image: null },
  ];

  return (
    <section aria-labelledby="shop-by-category" className="relative overflow-hidden px-4 py-16 md:px-6 lg:py-24">
      <GiantWordmark className="top-1/2 -translate-y-1/2 text-[30vw] lg:text-[22vw]" />
      <h2 id="shop-by-category" className="relative text-center font-heading text-h2 text-ink lg:text-h1">
        Shop by Category
      </h2>
      <ul className="relative mx-auto mt-8 grid max-w-[920px] grid-cols-3 gap-x-3 gap-y-6 md:gap-x-6 lg:mt-12 lg:gap-x-8 lg:gap-y-10">
        {tiles.map((tile) => (
          <li key={tile.slug}>
            <Link href={tile.href} className="group block">
              <div className="relative aspect-square overflow-hidden bg-ivory">
                {tile.image ? (
                  <Image
                    src={tile.image.url}
                    alt=""
                    fill
                    sizes={SIZES}
                    className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ElephantMark className="h-1/4 w-auto text-ink/10" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-body-sm text-ink md:mt-3">{tile.name}</p>
              {tile.comingSoon ? (
                <p className="mt-0.5 text-[10px] tracking-[0.14em] text-ink/70 uppercase">Coming soon</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
