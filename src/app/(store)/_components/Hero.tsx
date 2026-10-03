"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import type { HeroSlide } from "@/lib/data/catalog";
import { IVORY_BLUR } from "@/lib/images";

import { GiantWordmark } from "./GiantWordmark";

const AUTOPLAY_MS = 6000;
const SWIPE_PX = 40;

const pad = (n: number) => String(n).padStart(2, "0");

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Centred portrait over a faint giant ERAYAH. Crossfades (400ms) between
 * slides; autoplays every 6s, pausing on hover, touch, focus and for
 * reduced motion. Swipe on mobile; oval arrows, counter and dots on desktop.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => true);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  const autoplay = count > 1 && !paused && !reducedMotion;
  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [autoplay, count]);

  if (count === 0) return null;
  const current = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured pieces"
      className="relative overflow-hidden bg-paper-warm lg:h-[min(78vh,760px)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "ArrowRight") go(index + 1);
      }}
    >
      <GiantWordmark className="top-[1vw] lg:top-1/2 lg:-translate-y-1/2" />

      {/* Image frame: full width 4:5 on mobile; centred portrait on desktop. */}
      <div
        className="relative mt-[13vw] aspect-[4/5] w-full lg:absolute lg:inset-y-6 lg:left-1/2 lg:mt-0 lg:w-auto lg:-translate-x-1/2"
        onTouchStart={(event) => {
          touchX.current = event.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          touchX.current = null;
          setPaused(false);
          if (start === null) return;
          const dx = event.changedTouches[0].clientX - start;
          if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        <div aria-live={autoplay ? "off" : "polite"} className="absolute inset-0">
          {slides.map((slide, i) => (
            <SlideImage key={slide.key} slide={slide} active={i === index} first={i === 0} position={`${i + 1} of ${count}`} />
          ))}
        </div>

        {current.label ? (
          <div className="absolute inset-x-0 bottom-5 flex justify-center">
            <Link href={current.href} className="rounded-full">
              <Pill>{current.label}</Pill>
            </Link>
          </div>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          <OvalArrow direction="prev" onClick={() => go(index - 1)} />
          <OvalArrow direction="next" onClick={() => go(index + 1)} />

          <p className="absolute bottom-7 left-10 hidden text-caption tracking-[0.12em] text-ink/80 tabular-nums lg:block">
            {pad(index + 1)}/{pad(count)}
          </p>

          <div className="flex justify-center py-2 lg:absolute lg:right-8 lg:bottom-4 lg:py-0">
            {slides.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                aria-label={`Show slide ${i + 1}${slide.label ? `, ${slide.label}` : ""}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
                className="flex h-11 w-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "size-2 rounded-full border border-ink/70 transition-colors duration-300",
                    i === index ? "bg-ink" : "bg-transparent",
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

function SlideImage({ slide, active, first, position }: { slide: HeroSlide; active: boolean; first: boolean; position: string }) {
  const common = { alt: slide.alt, fill: true, quality: 75 } as const;
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: slide.desktopUrl, sizes: "40vw" });
  const {
    props: { srcSet: mobileSrcSet, ...img },
  } = getImageProps({ ...common, src: slide.mobileUrl, sizes: "100vw" });

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={position}
      aria-hidden={!active}
      inert={!active}
      className={cn("absolute inset-0 transition-opacity duration-[400ms]", active ? "opacity-100" : "opacity-0")}
    >
      <picture>
        <source media="(min-width: 1024px)" srcSet={desktopSrcSet} sizes="40vw" />
        <source srcSet={mobileSrcSet} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img
          {...img}
          loading={first ? "eager" : "lazy"}
          fetchPriority={first ? "high" : "auto"}
          className="object-cover"
          style={{
            ...img.style,
            backgroundImage: `url("${slide.blurDataUrl ?? IVORY_BLUR}")`,
            backgroundSize: "cover",
          }}
        />
      </picture>
    </div>
  );
}

function OvalArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 hidden h-11 w-[72px] -translate-y-1/2 items-center justify-center rounded-[50%] border border-ink/50 text-ink transition-opacity duration-300 hover:opacity-70 lg:flex",
        direction === "prev" ? "left-10" : "right-10",
      )}
    >
      <Icon icon={direction === "prev" ? ArrowLeft : ArrowRight} size={22} />
    </button>
  );
}
