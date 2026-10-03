import { PAGE_SIZE } from "@/lib/collection/params";
import type { CardImage, ProductCardData } from "@/lib/data/catalog";
import type { LifestyleTile, TileCandidate } from "@/lib/data/collection";
import { routes } from "@/lib/routes";

export type TileView = {
  key: string;
  image: CardImage;
  caption: string | null;
  href: string | null;
  span: 1 | 2;
  /** Automatic tiles differ by breakpoint: every 8 products on mobile, every 12 on desktop. */
  visibility: "all" | "mobile" | "desktop";
};

export type GridItem = { kind: "product"; product: ProductCardData } | { kind: "tile"; tile: TileView };

const AUTO_EVERY = { mobile: 8, desktop: 12 } as const;

/**
 * Interleaves lifestyle tiles with a page of products (curated order, no
 * filters only). Configured tiles go after their absolute curated position;
 * without any, product photos are used after every 8 products on mobile and
 * every 12 on desktop. Never after the last product, never two in a row.
 * Tiles don't count towards the 24 products per page.
 */
export function buildGridItems({
  products,
  page,
  configured,
  candidates,
  showTiles,
}: {
  products: ProductCardData[];
  page: number;
  configured: LifestyleTile[];
  candidates: TileCandidate[];
  showTiles: boolean;
}): GridItem[] {
  const tilesAfter = new Map<number, TileView[]>();
  const add = (index: number, tile: TileView) => tilesAfter.set(index, [...(tilesAfter.get(index) ?? []), tile]);

  if (showTiles && configured.length) {
    const offset = (page - 1) * PAGE_SIZE;
    for (const tile of configured) {
      const index = tile.insertAfter - offset;
      if (index >= 1 && index < products.length && !tilesAfter.has(index)) {
        add(index, { key: tile.key, image: tile.image, caption: tile.caption, href: tile.href, span: tile.span, visibility: "all" });
      }
    }
  } else if (showTiles) {
    const onPage = new Set(products.map((p) => p.id));
    const used = new Set<number>();
    const pick = (index: number): TileCandidate | undefined => {
      // Prefer pieces not shown on this page, then on-page pieces far from the tile.
      const off = candidates.find((c) => !onPage.has(c.productId) && !used.has(c.productId));
      if (off) return off;
      return candidates
        .filter((c) => !used.has(c.productId))
        .map((c) => ({ c, distance: Math.abs(products.findIndex((p) => p.id === c.productId) - index) }))
        .filter(({ distance }) => distance > 4)
        .sort((a, b) => b.distance - a.distance)[0]?.c;
    };

    for (const [visibility, every] of Object.entries(AUTO_EVERY) as ["mobile" | "desktop", number][]) {
      for (let index = every; index < products.length; index += every) {
        const candidate = pick(index);
        if (!candidate) break;
        used.add(candidate.productId);
        add(index, {
          key: `auto-${visibility}-${index}`,
          image: candidate.image,
          caption: candidate.name,
          href: routes.product(candidate.slug),
          span: 2,
          visibility,
        });
      }
    }
  }

  const items: GridItem[] = [];
  products.forEach((product, i) => {
    items.push({ kind: "product", product });
    for (const tile of tilesAfter.get(i + 1) ?? []) items.push({ kind: "tile", tile });
  });
  return items;
}
