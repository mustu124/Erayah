"use client";

import { TriangleAlert } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { DragHandle, Sortable } from "@/components/admin/Sortable";
import { useAdminAction } from "@/components/admin/use-action";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { saveMerchOrder } from "@/lib/admin/actions/merch";
import type { MerchProduct, MerchTile } from "@/lib/admin/merch";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format/price";

type Item = { type: "product"; key: string; product: MerchProduct } | { type: "tile"; key: string; tile: MerchTile };

const family = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/)[0].toLowerCase();

/** Gentle checks on the order. They never stop a save. */
export function merchWarnings(products: MerchProduct[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < products.length; i++) {
    if (family(products[i].name) === family(products[i - 1].name)) {
      out.push(`Two ${products[i].name.split(/\s+/)[0]} pieces are next to each other (positions ${i} and ${i + 1}).`);
    }
  }
  if (products.length >= 4 && !products.slice(0, 4).some((p) => p.isHero)) out.push("The first 4 slots have no hero piece.");
  let run = 0;
  for (let i = 0; i < products.length; i++) {
    run = (products[i].price ?? 0) < 200_000 ? run + 1 : 0;
    if (run === 4) out.push(`Four pieces in a row under ₹2,000 (positions ${i - 2}–${i + 1}).`);
  }
  return out;
}

function interleave(products: MerchProduct[], tiles: MerchTile[]): Item[] {
  const items: Item[] = [];
  const sorted = [...tiles].sort((a, b) => a.insertAfter - b.insertAfter);
  let t = 0;
  products.forEach((product, i) => {
    while (t < sorted.length && sorted[t].insertAfter <= i) items.push({ type: "tile", key: `t${sorted[t].id}`, tile: sorted[t++] });
    items.push({ type: "product", key: `p${product.id}`, product });
  });
  while (t < sorted.length) items.push({ type: "tile", key: `t${sorted[t].id}`, tile: sorted[t++] });
  return items;
}

export function MerchGrid({ scope, products, tiles, sortable }: { scope: string; products: MerchProduct[]; tiles: MerchTile[]; sortable: boolean }) {
  const initial = interleave(products, sortable ? tiles : []);
  const [items, setItems] = useState(initial);
  const [source, setSource] = useState({ products, tiles });
  const [dirty, setDirty] = useState(false);
  if (source.products !== products || source.tiles !== tiles) {
    setSource({ products, tiles });
    setItems(initial);
    setDirty(false);
  }
  const save = useAdminAction(saveMerchOrder);
  const ordered = items.flatMap((i) => (i.type === "product" ? [i.product] : []));
  const warnings = merchWarnings(ordered);

  const position = new Map(ordered.map((p, i) => [p.id, i + 1]));
  return (
    <div>
      {warnings.length ? (
        <ul className="mb-4 space-y-1 border border-gold bg-gold-light/40 px-4 py-3 text-body-sm" aria-label="Suggestions">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <Icon icon={TriangleAlert} size={15} className="mt-0.5 shrink-0 text-gold" />
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      {sortable ? (
        <div className="sticky top-14 z-10 -mx-1 mb-3 flex items-center gap-3 bg-paper-warm/95 px-1 py-2 backdrop-blur lg:top-0">
          <Button disabled={!dirty || save.pending} onClick={async () => (await save.run({ scope, items: items.map((i) => ({ type: i.type, id: i.type === "product" ? i.product.id : i.tile.id })) })).ok && setDirty(false)}>
            {save.pending ? "Saving…" : "Save order"}
          </Button>
          <span className="text-body-sm text-ink/60">{dirty ? "Unsaved changes" : "Drag pieces by the grip to reorder."}</span>
        </div>
      ) : null}

      <Sortable
        items={items}
        getId={(i) => i.key}
        layout="grid"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        itemClassName={(i) => (i.type === "tile" && i.tile.span === 2 ? "col-span-2" : undefined)}
        onReorder={(next) => {
          if (!sortable) return;
          setItems(next);
          setDirty(true);
        }}
      >
        {(item, handle) => {
          if (item.type === "tile") {
            const t = item.tile;
            return (
              <div className={cn("relative h-full min-h-40 overflow-hidden bg-ivory", !t.isActive && "opacity-40")}>
                <Image src={t.imageUrl} alt={t.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-ink/55 px-3 py-2 text-caption text-ivory">
                  Lifestyle tile{t.caption ? `: ${t.caption}` : ""}
                  {t.isActive ? "" : " (hidden)"}
                </div>
                {sortable ? (
                  <div className="absolute top-1 left-1 rounded-xs bg-paper/90">
                    <DragHandle handle={handle} label="Move lifestyle tile" />
                  </div>
                ) : null}
              </div>
            );
          }
          const p = item.product;
          return (
            <article className="bg-paper">
              <div className="relative aspect-[4/5] bg-ivory">
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt="" fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" placeholder={p.blur ? "blur" : "empty"} blurDataURL={p.blur ?? undefined} />
                ) : null}
                <span className="absolute top-1 right-1 rounded-full bg-paper/90 px-2 text-caption tabular-nums">{position.get(p.id)}</span>
                {sortable ? (
                  <div className="absolute top-1 left-1 rounded-xs bg-paper/90">
                    <DragHandle handle={handle} label={`Move ${p.name}`} />
                  </div>
                ) : null}
                {p.isHero ? <span className="absolute bottom-1 left-1 rounded-full bg-ink px-2 text-[11px] text-ivory">Hero</span> : null}
                {p.soldOut ? <span className="absolute right-1 bottom-1 rounded-full bg-paper px-2 text-[11px]">Sold out</span> : null}
              </div>
              <div className="px-1 pt-2 pb-1 text-center">
                <p className="truncate text-body-sm text-ink">{p.name}</p>
                <p className="text-caption text-ink/70 tabular-nums">{p.price ? formatPrice(p.price) : "No price"}</p>
              </div>
            </article>
          );
        }}
      </Sortable>
      {!items.length ? <p className="py-10 text-center text-body-sm text-ink/60">No published pieces here yet.</p> : null}
    </div>
  );
}
