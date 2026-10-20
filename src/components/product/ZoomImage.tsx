"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

const SCALE = 2.2;

type ZoomImageProps = {
  src: string;
  alt: string;
  sizes: string;
  first: boolean;
  /** The slide on screen; others are always shown un-zoomed. */
  active: boolean;
  /** Called with true while zoomed, so the carousel can stop swiping. */
  onZoomChange?: (zoomed: boolean) => void;
};

/**
 * A product photo that zooms in place. With a mouse, it enlarges under the
 * pointer while hovered; on touch (or with Enter/Space), a tap toggles the
 * zoom and the finger pans around the enlarged photo.
 */
export function ZoomImage({ src, alt, sizes, first, active, onZoomChange }: ZoomImageProps) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  // Moving to another slide zooms this one back out.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setZoomed(false);
  }

  const aim = (el: HTMLElement, x: number, y: number) => {
    const r = el.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100));
    const py = Math.min(100, Math.max(0, ((y - r.top) / r.height) * 100));
    setOrigin(`${px}% ${py}%`);
  };
  const set = (z: boolean) => {
    setZoomed(z);
    onZoomChange?.(z);
  };

  return (
    <button
      type="button"
      aria-label={zoomed ? `Zoom out of ${alt}` : `Zoom in on ${alt}`}
      aria-pressed={zoomed}
      className={cn("absolute inset-0 overflow-hidden", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        aim(e.currentTarget, e.clientX, e.clientY);
        set(true);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse" || zoomed) aim(e.currentTarget, e.clientX, e.clientY);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") set(false);
      }}
      onClick={(e) => {
        // Mouse users zoom by hovering; a click (or a tap, or Enter) toggles.
        if (e.detail === 0) setOrigin("50% 50%");
        else aim(e.currentTarget, e.clientX, e.clientY);
        set(!zoomed);
      }}
      onTouchMove={(e) => {
        if (!zoomed) return;
        e.stopPropagation();
        aim(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY);
      }}
      style={zoomed ? { touchAction: "none" } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={first}
        loading={first ? "eager" : "lazy"}
        className="object-cover transition-transform duration-300 ease-out"
        style={{ transformOrigin: origin, transform: zoomed ? `scale(${SCALE})` : "none" }}
      />
    </button>
  );
}
