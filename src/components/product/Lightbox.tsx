"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { GalleryItem } from "@/lib/data/product";

type LightboxProps = {
  items: GalleryItem[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  name: string;
};

const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;

type View = { scale: number; x: number; y: number };
const RESET: View = { scale: 1, x: 0, y: 0 };

/**
 * Full-screen viewer. Pinch, double-tap/double-click or ctrl/⌘ + wheel to
 * zoom (zoom happens only here, never on hover), drag to pan when zoomed,
 * swipe or arrows to move between images, Esc to close.
 */
export function Lightbox({ items, index, onIndexChange, onClose, name }: LightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(RESET);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; scale: number; startX: number; startY: number; view: View } | null>(null);
  const open = index !== null;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && el.open) {
      el.close();
      document.documentElement.style.overflow = "";
    }
  }, [open]);

  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  const go = (step: number) => {
    if (index === null) return;
    setView(RESET);
    onIndexChange((index + step + items.length) % items.length);
  };

  const clamp = (v: View): View => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return v;
    const maxX = ((v.scale - 1) * rect.width) / 2;
    const maxY = ((v.scale - 1) * rect.height) / 2;
    return { scale: v.scale, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) };
  };

  const zoomAt = (clientX: number, clientY: number, scale: number) => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.max(1, Math.min(MAX_ZOOM, scale));
    const cx = clientX - (rect.left + rect.width / 2);
    const cy = clientY - (rect.top + rect.height / 2);
    setView(clamp({ scale: s, x: -cx * (s - 1), y: -cy * (s - 1) }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      scale: view.scale,
      startX: e.clientX,
      startY: e.clientY,
      view,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length === 2 && g.dist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = Math.max(1, Math.min(MAX_ZOOM, (g.scale * dist) / g.dist));
      setView((v) => clamp({ ...v, scale, ...(scale === 1 ? { x: 0, y: 0 } : {}) }));
    } else if (pts.length === 1 && g.view.scale > 1) {
      setView(clamp({ scale: g.view.scale, x: g.view.x + e.clientX - g.startX, y: g.view.y + e.clientY - g.startY }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (g && pointers.current.size === 0 && view.scale === 1 && g.scale === 1) {
      const dx = e.clientX - g.startX;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - g.startY)) go(dx < 0 ? 1 : -1);
    }
    if (pointers.current.size === 0) gesture.current = null;
  };

  const item = index !== null ? items[index] : null;

  return (
    <dialog
      ref={dialog}
      aria-label={`${name}, image viewer`}
      onCancel={(e) => {
        e.preventDefault();
        setView(RESET);
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      className="drawer fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-ivory"
    >
      {item ? (
        <div className="relative flex h-full flex-col">
          <div className="flex min-h-14 items-center justify-between px-4">
            <p className="text-caption tracking-[0.12em] tabular-nums" aria-live="polite">
              {(index ?? 0) + 1} / {items.length}
            </p>
            <button
              type="button"
              aria-label="Close image viewer"
              onClick={() => {
                setView(RESET);
                onClose();
              }}
              className="flex size-11 items-center justify-center"
            >
              <Icon icon={X} size={24} />
            </button>
          </div>

          <div
            ref={stage}
            className="relative flex-1 touch-none overflow-hidden select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={(e) => (view.scale > 1 ? setView(RESET) : zoomAt(e.clientX, e.clientY, TAP_ZOOM))}
            onWheel={(e) => {
              if (!e.ctrlKey && !e.metaKey && view.scale === 1) return;
              zoomAt(e.clientX, e.clientY, view.scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
            }}
            style={{ cursor: view.scale > 1 ? "grab" : "zoom-in" }}
          >
            <div
              className="absolute inset-0 transition-transform duration-150 ease-out"
              style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            >
              {item.role === "video" ? (
                <video src={item.url} className="h-full w-full object-contain" muted loop playsInline autoPlay controls />
              ) : (
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  sizes="100vw"
                  quality={75}
                  className="pointer-events-none object-contain"
                  draggable={false}
                />
              )}
            </div>
          </div>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/40 md:flex"
              >
                <Icon icon={ChevronLeft} />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/40 md:flex"
              >
                <Icon icon={ChevronRight} />
              </button>
            </>
          ) : null}
          <p className="pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-caption text-ivory/70">
            Pinch or double-tap to zoom
          </p>
        </div>
      ) : null}
    </dialog>
  );
}
