"use client";

import { ChevronDown } from "lucide-react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { SORTS, type SortKey } from "@/lib/collection/params";

import { useFilters } from "./FilterProvider";

/**
 * "SORT BY" with a native select (best on phones). `variant="button"` shows it
 * as an outlined button with the current choice, for the mobile bar.
 */
export function SortSelect({ variant = "inline", className }: { variant?: "inline" | "button"; className?: string }) {
  const { filters, apply } = useFilters();
  const current = SORTS.find((s) => s.value === filters.sort)?.label ?? "Curated";
  const onChange = (value: string) => apply((f) => ({ ...f, sort: value as SortKey }));

  const select = (
    <select
      aria-label="Sort by"
      value={filters.sort}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        variant === "button"
          ? "absolute inset-0 h-full w-full cursor-pointer opacity-0"
          : "h-11 cursor-pointer appearance-none rounded-xs border border-mist bg-paper pr-10 pl-3 text-body-sm text-ink focus:border-ink",
      )}
    >
      {SORTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );

  if (variant === "button") {
    return (
      <div
        className={cn(
          "relative flex h-11 items-center justify-between gap-2 rounded-xs border border-ink px-3 text-[12px] font-medium tracking-[0.12em] text-ink uppercase focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-plum",
          className,
        )}
      >
        <span className="truncate">
          Sort by<span className="sr-only">, currently {current}</span>
        </span>
        <Icon icon={ChevronDown} size={16} />
        {select}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span aria-hidden="true" className="text-[11px] font-medium tracking-[0.14em] text-ink/70 uppercase">
        Sort by
      </span>
      <div className="relative">
        {select}
        <Icon icon={ChevronDown} size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
      </div>
    </div>
  );
}
