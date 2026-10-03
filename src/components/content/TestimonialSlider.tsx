"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Testimonial } from "@/lib/data/content";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One quote at a time, crossfading. Thin oval arrows either side of an
 * "01 — 05" counter; swipe on touch, arrow keys when focused. No autoplay.
 */
export function TestimonialSlider({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const count = items.length;
  const go = (i: number) => setIndex((i + count) % count);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="What our customers say"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      }}
      className="mx-auto max-w-2xl text-center outline-none focus-visible:ring-1 focus-visible:ring-plum"
    >
      <div className="grid">
        {items.map((t, i) => (
          <figure
            key={t.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn("col-start-1 row-start-1 transition-opacity duration-400", i === index ? "opacity-100" : "opacity-0")}
          >
            <blockquote className="font-heading text-[20px] leading-[1.6] text-ink italic lg:text-[24px]">“{t.quote}”</blockquote>
            <figcaption className="mt-6 text-[11px] font-medium tracking-[0.16em] text-ink/70 uppercase">
              {t.author}
              {t.location ? <span className="text-ink/50"> · {t.location}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
      {count > 1 ? (
        <div className="mt-10 flex items-center justify-center gap-6">
          <button type="button" aria-label="Previous quote" onClick={() => go(index - 1)} className="flex h-11 w-16 items-center justify-center rounded-[50%] border border-ink/40 text-ink transition-opacity duration-300 hover:opacity-70">
            <Icon icon={ArrowLeft} size={18} />
          </button>
          <p className="text-caption tracking-[0.14em] text-ink/70 tabular-nums" aria-live="polite">
            {pad(index + 1)} — {pad(count)}
          </p>
          <button type="button" aria-label="Next quote" onClick={() => go(index + 1)} className="flex h-11 w-16 items-center justify-center rounded-[50%] border border-ink/40 text-ink transition-opacity duration-300 hover:opacity-70">
            <Icon icon={ArrowRight} size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
