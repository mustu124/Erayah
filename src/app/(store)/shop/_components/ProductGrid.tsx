import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";

import type { GridItem, TileView } from "./grid-items";

const CARD_SIZES = "(min-width: 1440px) 280px, (min-width: 1024px) 20vw, (min-width: 768px) 31vw, 48vw";

/** 2 columns on mobile, 3 on tablet, 4 on desktop, with lifestyle tiles between rows. */
export function ProductGrid({ items }: { items: GridItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
      {items.map((item, i) =>
        item.kind === "product" ? (
          <li key={item.product.id}>
            <ProductCard product={item.product} sizes={CARD_SIZES} preload={i < 2} />
          </li>
        ) : (
          <TileItem key={item.tile.key} tile={item.tile} />
        ),
      )}
    </ul>
  );
}

function TileItem({ tile }: { tile: TileView }) {
  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory lg:aspect-video">
        <Image
          src={tile.image.url}
          alt={tile.image.alt}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover transition-opacity duration-300 group-hover:opacity-95"
        />
      </div>
      {tile.caption ? <p className="mt-3 font-script text-h3 text-ink italic">{tile.caption}</p> : null}
    </>
  );

  return (
    <li
      data-lifestyle-tile={tile.visibility}
      aria-hidden={tile.href ? undefined : true}
      className={cn(
        "col-span-2",
        tile.span === 1 && "lg:col-span-1",
        tile.visibility === "mobile" && "lg:hidden",
        tile.visibility === "desktop" && "hidden lg:block",
      )}
    >
      {tile.href ? (
        <Link href={tile.href} className="group block">
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
