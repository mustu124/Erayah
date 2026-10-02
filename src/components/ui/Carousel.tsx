"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useCallback, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type CarouselProps = {
  /** Accessible name, e.g. "Best Sellers". */
  label: string;
  children: ReactNode;
  /** Width of each slide. Default: 2 per row on mobile, 4 on desktop. */
  slideClassName?: string;
  /** Vertical position of the arrows, to centre them on the images. */
  arrowTopClassName?: string;
  className?: string;
};

type Snapshot = { snaps: number[]; selected: number; canPrev: boolean; canNext: boolean };

const EMPTY: Snapshot = { snaps: [], selected: 0, canPrev: false, canNext: false };

/** Horizontal row with small round outlined arrows over the images and a dot pager below. */
export function Carousel({
  label,
  children,
  slideClassName = "basis-[46%] md:basis-1/4",
  arrowTopClassName = "top-[38%]",
  className,
}: CarouselProps) {
  const [viewportRef, api] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", slidesToScroll: "auto" });
  const [state, setState] = useState<Snapshot>(EMPTY);

  const sync = useCallback(() => {
    if (!api) return;
    setState({
      snaps: api.scrollSnapList(),
      selected: api.selectedScrollSnap(),
      canPrev: api.canScrollPrev(),
      canNext: api.canScrollNext(),
    });
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.on("init", sync).on("reInit", sync).on("select", sync);
    queueMicrotask(sync);
    return () => {
      api.off("init", sync).off("reInit", sync).off("select", sync);
    };
  }, [api, sync]);

  const slides = Children.toArray(children);

  return (
    <section aria-roledescription="carousel" aria-label={label} className={cn("relative", className)}>
      <div ref={viewportRef} className="overflow-hidden">
        <div className="-ml-4 flex touch-pan-y">
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              className={cn("min-w-0 shrink-0 grow-0 pl-4", slideClassName)}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {state.snaps.length > 1 ? (
        <>
          <ArrowButton direction="prev" disabled={!state.canPrev} onClick={() => api?.scrollPrev()} className={arrowTopClassName} />
          <ArrowButton direction="next" disabled={!state.canNext} onClick={() => api?.scrollNext()} className={arrowTopClassName} />
          <div className="mt-2 flex">
            {state.snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide group ${i + 1}`}
                aria-current={i === state.selected ? "true" : undefined}
                onClick={() => api?.scrollTo(i)}
                className="flex h-11 w-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "size-2 rounded-full border border-ink transition-colors duration-300",
                    i === state.selected ? "bg-ink" : "bg-transparent",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
  className,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous" : "Next"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute z-10 flex size-11 -translate-y-1/2 items-center justify-center transition-opacity duration-300 disabled:pointer-events-none disabled:opacity-0",
        direction === "prev" ? "-left-1" : "-right-1",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full border border-ink/50 bg-paper/80 text-ink">
        <Icon icon={direction === "prev" ? ChevronLeft : ChevronRight} size={16} />
      </span>
    </button>
  );
}
