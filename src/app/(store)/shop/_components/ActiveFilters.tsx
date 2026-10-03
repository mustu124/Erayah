"use client";

import { X } from "lucide-react";

import { Icon } from "@/components/ui/Icon";
import { colourLabel, EMPTY_FILTERS, hasActiveFilters, styleLabel, type Filters } from "@/lib/collection/params";
import { formatPrice } from "@/lib/format/price";

import { useFilters } from "./FilterProvider";

type Chip = { key: string; label: string; remove: (f: Filters) => Filters };

/** Removable chips for each applied filter, plus "Clear all". */
export function ActiveFilters({ categoryNames }: { categoryNames: Record<string, string> }) {
  const { filters, apply } = useFilters();
  if (!hasActiveFilters(filters)) return null;

  const chips: Chip[] = [
    ...filters.availability.map((a) => ({
      key: `availability-${a}`,
      label: a === "in_stock" ? "In stock" : "Sold out",
      remove: (f: Filters) => ({ ...f, availability: f.availability.filter((v) => v !== a) }),
    })),
    ...(filters.min !== null || filters.max !== null
      ? [
          {
            key: "price",
            label:
              filters.min !== null && filters.max !== null
                ? `${formatPrice(filters.min * 100)} – ${formatPrice(filters.max * 100)}`
                : filters.min !== null
                  ? `From ${formatPrice(filters.min * 100)}`
                  : `Up to ${formatPrice((filters.max as number) * 100)}`,
            remove: (f: Filters) => ({ ...f, min: null, max: null }),
          },
        ]
      : []),
    ...filters.colours.map((c) => ({
      key: `colour-${c}`,
      label: colourLabel(c),
      remove: (f: Filters) => ({ ...f, colours: f.colours.filter((v) => v !== c) }),
    })),
    ...filters.categories.map((c) => ({
      key: `category-${c}`,
      label: categoryNames[c] ?? c,
      remove: (f: Filters) => ({ ...f, categories: f.categories.filter((v) => v !== c) }),
    })),
    ...filters.styles.map((s) => ({
      key: `style-${s}`,
      label: styleLabel(s),
      remove: (f: Filters) => ({ ...f, styles: f.styles.filter((v) => v !== s) }),
    })),
    ...(filters.gift ? [{ key: "gift", label: "Gifts for Her", remove: (f: Filters) => ({ ...f, gift: false }) }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="region">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => apply(chip.remove)}
          aria-label={`Remove filter: ${chip.label}`}
          className="flex min-h-9 items-center gap-1.5 rounded-full border border-mist bg-paper px-3 text-caption text-ink transition-colors duration-300 hover:border-ink"
        >
          {chip.label}
          <Icon icon={X} size={13} />
        </button>
      ))}
      <button
        type="button"
        onClick={() => apply((f) => ({ ...EMPTY_FILTERS, sort: f.sort }))}
        className="min-h-9 px-2 text-caption text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
      >
        Clear all
      </button>
    </div>
  );
}

/** "No pieces match these filters" with a way out. */
export function NoResults() {
  const { apply } = useFilters();
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <p className="font-heading text-h3 text-ink">No pieces match these filters</p>
      <button
        type="button"
        onClick={() => apply((f) => ({ ...EMPTY_FILTERS, sort: f.sort }))}
        className="min-h-11 rounded-xs border border-ink px-7 text-[12px] font-medium tracking-[0.12em] text-ink uppercase transition-colors duration-300 hover:bg-ink hover:text-ivory"
      >
        Clear filters
      </button>
    </div>
  );
}
