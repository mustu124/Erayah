"use client";

import { Check } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { colourLabel, styleLabel } from "@/lib/collection/params";
import type { Scope } from "@/lib/collection/scopes";
import type { Facets } from "@/lib/data/collection";

import { toggle, useFilters } from "./FilterProvider";
import { PriceRange } from "./PriceRange";

export const SWATCH: Record<string, string> = {
  white: "#ffffff",
  green: "#3e7a5a",
  pink: "#e6a3b6",
  blue: "#3c5ea8",
  red: "#a8323e",
  turquoise: "#3fb2ad",
  multicolour: "conic-gradient(#a8323e, #e6a3b6, #3fb2ad, #3c5ea8, #3e7a5a, #a8323e)",
  pearl: "radial-gradient(circle at 35% 30%, #ffffff, #efe6d8 60%, #d9cbb5)",
};

/** Filter groups for the desktop rail and the mobile drawer. */
export function FilterPanel({ scope, facets }: { scope: Scope; facets: Facets }) {
  const { filters, apply } = useFilters();

  return (
    <div>
      <Group title="Availability">
        <Checkbox
          label={<Counted label="In stock" count={facets.inStock} />}
          checked={filters.availability.includes("in_stock")}
          onChange={() => apply((f) => ({ ...f, availability: toggle(f.availability, "in_stock") }))}
        />
        <Checkbox
          label={<Counted label="Sold out" count={facets.soldOut} />}
          checked={filters.availability.includes("sold_out")}
          disabled={facets.soldOut === 0 && !filters.availability.includes("sold_out")}
          onChange={() => apply((f) => ({ ...f, availability: toggle(f.availability, "sold_out") }))}
        />
      </Group>

      {facets.priceMax > facets.priceMin ? (
        <Group title="Price">
          <PriceRange
            key={`${filters.min}-${filters.max}`}
            min={facets.priceMin}
            max={facets.priceMax}
            histogram={facets.histogram}
            low={filters.min}
            high={filters.max}
            onCommit={(low, high) => apply((f) => ({ ...f, min: low, max: high }))}
          />
        </Group>
      ) : null}

      {facets.colours.length ? (
        <Group title="Colour">
          <div className="flex flex-wrap gap-x-1 gap-y-2">
            {facets.colours.map(({ value }) => {
              const on = filters.colours.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => apply((f) => ({ ...f, colours: toggle(f.colours, value) }))}
                  className="flex min-h-11 w-[68px] flex-col items-center gap-1.5 pt-1 text-[11px] text-ink"
                >
                  <span
                    className={cn(
                      "relative flex size-7 items-center justify-center rounded-full border",
                      on ? "border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper-warm" : "border-mist",
                    )}
                    style={{ background: SWATCH[value] }}
                  >
                    {on ? (
                      <span className="flex size-4 items-center justify-center rounded-full bg-paper/90">
                        <Icon icon={Check} size={11} />
                      </span>
                    ) : null}
                  </span>
                  {colourLabel(value)}
                </button>
              );
            })}
          </div>
        </Group>
      ) : null}

      {scope.showCategoryFilter && facets.categories.length > 1 ? (
        <Group title="Category">
          {facets.categories.map((c) => (
            <Checkbox
              key={c.slug}
              label={<Counted label={c.name} count={c.count} />}
              checked={filters.categories.includes(c.slug)}
              onChange={() => apply((f) => ({ ...f, categories: toggle(f.categories, c.slug) }))}
            />
          ))}
        </Group>
      ) : null}

      {facets.styles.length ? (
        <Group title="Style">
          {facets.styles.map((s) => (
            <Checkbox
              key={s.value}
              label={<Counted label={styleLabel(s.value)} count={s.count} />}
              checked={filters.styles.includes(s.value)}
              onChange={() => apply((f) => ({ ...f, styles: toggle(f.styles, s.value) }))}
            />
          ))}
        </Group>
      ) : null}

      {scope.showGiftFilter && facets.gifts > 0 ? (
        <Group title="Gifts for Her">
          <button
            type="button"
            role="switch"
            aria-checked={filters.gift}
            onClick={() => apply((f) => ({ ...f, gift: !f.gift }))}
            className="flex min-h-11 w-full items-center justify-between gap-4 text-body-sm text-ink"
          >
            <span>Show gifts only</span>
            <span className={cn("relative h-6 w-11 rounded-full transition-colors duration-300", filters.gift ? "bg-ink" : "bg-mist")}>
              <span
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-paper transition-[left] duration-300",
                  filters.gift ? "left-6" : "left-1",
                )}
              />
            </span>
          </button>
        </Group>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="border-t border-mist py-5 first:border-t-0 first:pt-0">
      <h3 id={id} className="mb-2 font-body text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Counted({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label} <span className="text-ink/60 tabular-nums">({count})</span>
    </>
  );
}
