"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format/price";

type PriceRangeProps = {
  /** Bounds of the prices in this collection, in rupees. */
  min: number;
  max: number;
  histogram: number[];
  /** Current selection in rupees (null = unbounded). */
  low: number | null;
  high: number | null;
  onCommit: (low: number | null, high: number | null) => void;
};

const STEP = 100;
const rupees = (n: number) => formatPrice(n * 100);

/** Two-thumb price slider with a histogram of prices drawn as small ink bars above it. */
export function PriceRange({ min, max, histogram, low, high, onCommit }: PriceRangeProps) {
  const committed: [number, number] = [low ?? min, high ?? max];
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const [lo, hi] = draft ?? committed;

  if (max <= min) return null;
  const peak = Math.max(1, ...histogram);
  const span = max - min;

  const commit = () => {
    if (!draft) return;
    const [a, b] = draft;
    setDraft(null);
    onCommit(a <= min ? null : a, b >= max ? null : b);
  };

  return (
    <div>
      <div aria-hidden="true" className="flex h-12 items-end gap-px">
        {histogram.map((n, i) => {
          const binLow = min + (span * i) / histogram.length;
          const binHigh = min + (span * (i + 1)) / histogram.length;
          const inRange = binHigh > lo && binLow < hi;
          return (
            <span
              key={i}
              className={cn("flex-1 transition-colors duration-300", inRange ? "bg-ink" : "bg-ink/20")}
              style={{ height: n ? `${Math.max(8, (n / peak) * 100)}%` : "2px" }}
            />
          );
        })}
      </div>
      <div className="dual-range relative h-6">
        <input
          type="range"
          aria-label="Minimum price"
          aria-valuetext={rupees(lo)}
          min={min}
          max={max}
          step={STEP}
          value={lo}
          onChange={(e) => setDraft([Math.min(Number(e.target.value), hi - STEP), hi])}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
        <input
          type="range"
          aria-label="Maximum price"
          aria-valuetext={rupees(hi)}
          min={min}
          max={max}
          step={STEP}
          value={hi}
          onChange={(e) => setDraft([lo, Math.max(Number(e.target.value), lo + STEP)])}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
        />
      </div>
      <div className="mt-1 flex justify-between text-caption text-ink/80 tabular-nums">
        <span>{rupees(lo)}</span>
        <span>{rupees(hi)}</span>
      </div>
    </div>
  );
}
