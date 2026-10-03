"use client";

import useEmblaCarousel from "embla-carousel-react";
import { Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import type { GalleryItem } from "@/lib/data/product";
import { IVORY_BLUR } from "@/lib/images";

import { Lightbox } from "./Lightbox";

/**
 * Main image (4:5, swipeable) with a thumbnail strip below; tap or click to
 * open the full-screen viewer. Videos play muted, looped and inline.
 */
export function Gallery({ items, name }: { items: GalleryItem[]; name: string }) {
  const [viewport, api] = useEmblaCarousel({ loop: false });
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const poster = items.find((i) => i.role !== "video")?.url;

  const sync = useCallback(() => api && setSelected(api.selectedScrollSnap()), [api]);
  useEffect(() => {
    if (!api) return;
    api.on("select", sync).on("reInit", sync);
    return () => {
      api.off("select", sync).off("reInit", sync);
    };
  }, [api, sync]);

  if (!items.length) return <div className="aspect-[4/5] bg-ivory" />;

  return (
    <div>
      <div className="relative">
        <div ref={viewport} className="overflow-hidden bg-ivory">
          <div className="flex touch-pan-y">
            {items.map((item, i) => (
              <div key={item.key} className="relative aspect-[4/5] min-w-0 shrink-0 grow-0 basis-full">
                {item.role === "video" ? (
                  <video
                    src={item.url}
                    poster={poster}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="metadata"
                    aria-label={item.alt}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label={`View image ${i + 1} of ${items.length} full screen`}
                    className="absolute inset-0 cursor-zoom-in"
                  >
                    <Image
                      src={item.url}
                      alt={item.alt}
                      fill
                      sizes="(min-width: 1440px) 760px, (min-width: 1024px) 52vw, 100vw"
                      preload={i === 0}
                      loading={i === 0 ? "eager" : "lazy"}
                      placeholder="blur"
                      blurDataURL={item.blurDataUrl ?? IVORY_BLUR}
                      className="object-cover"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center lg:hidden">
          <Pill className="bg-ink/55 px-3 py-1 text-caption text-ivory border-transparent">Tap to expand</Pill>
        </div>
      </div>

      {items.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:px-0" role="tablist" aria-label="Product images">
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={item.role === "video" ? "Video" : `Image ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "relative w-16 shrink-0 border-b-2 pb-1.5 transition-[opacity,border-color] duration-300 lg:w-20",
                i === selected ? "border-ink opacity-100" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <span className="relative block aspect-[4/5] overflow-hidden bg-ivory">
                {item.role === "video" ? (
                  <>
                    {poster ? <Image src={poster} alt="" fill sizes="80px" className="object-cover" /> : null}
                    <span className="absolute inset-0 flex items-center justify-center text-paper">
                      <Icon icon={Play} size={18} fill="currentColor" />
                    </span>
                  </>
                ) : (
                  <Image src={item.url} alt="" fill sizes="80px" className="object-cover" />
                )}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <Lightbox items={items} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} name={name} />
    </div>
  );
}
