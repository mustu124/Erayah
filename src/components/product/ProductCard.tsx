import Image from "next/image";
import Link from "next/link";

import { ElephantMark } from "@/components/ui/Logo";
import { Price } from "@/components/ui/Price";
import type { ProductCardData } from "@/lib/data/catalog";
import { routes } from "@/lib/routes";

import { WishlistHeart } from "./WishlistHeart";

type ProductCardProps = {
  product: ProductCardData;
  /** `sizes` for the image, matching the grid or carousel it sits in. */
  sizes: string;
  /** Preload the image (only for cards that are the page's largest image). */
  preload?: boolean;
};

/**
 * Image (4:5, on ivory), name and price. Nothing else, apart from a small
 * heart and, when stock is 0, "Sold out". On desktop hover the worn close-up
 * crossfades to the lifestyle image (opacity only; no hover swap on touch).
 */
export function ProductCard({ product, sizes, preload = false }: ProductCardProps) {
  const { image, hoverImage } = product;
  const swap = hoverImage && image && hoverImage.url !== image.url;

  return (
    <article className="group relative">
      <Link href={routes.product(product.slug)} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt}
              fill
              sizes={sizes}
              preload={preload}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ElephantMark className="h-10 w-auto text-ink/10" />
            </div>
          )}
          {swap ? (
            <Image
              src={hoverImage.url}
              alt=""
              aria-hidden="true"
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : null}
        </div>
        <h3 className="mt-3 font-body text-body-sm leading-snug text-ink">{product.name}</h3>
        <Price amount={product.price} className="mt-0.5 block text-body-sm text-ink/70" />
        {product.soldOut ? <p className="mt-1 text-[10px] tracking-[0.14em] text-ink/70 uppercase">Sold out</p> : null}
      </Link>
      <WishlistHeart productId={product.id} slug={product.slug} name={product.name} className="absolute top-0 right-0" />
    </article>
  );
}
