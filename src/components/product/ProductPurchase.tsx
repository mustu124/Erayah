"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Price } from "@/components/ui/Price";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";
import { whatsappUrl } from "@/lib/whatsapp";
import { MAX_QUANTITY, useCart } from "@/stores/cart";
import { useRecentlyViewed } from "@/stores/recently-viewed";
import { useUI } from "@/stores/ui";
import { selectIsWishlisted, useWishlist } from "@/stores/wishlist";

import { PincodeCheck } from "./PincodeCheck";

type ProductPurchaseProps = {
  product: {
    id: number;
    slug: string;
    name: string;
    price: number | null;
    stockQty: number;
    variants: { label: string; colour: string | null; stockQty: number }[];
  };
  url: string;
  whatsappNumber: string;
};

/**
 * Variant chips, availability, delivery estimate, then quantity + ADD TO CART
 * + heart in one row. On mobile a sticky bar takes over once that row scrolls
 * out of view. Also records the product as recently viewed and points the
 * WhatsApp button at it.
 */
export function ProductPurchase({ product, url, whatsappNumber }: ProductPurchaseProps) {
  const hasVariants = product.variants.length > 0;
  const [variant, setVariant] = useState<string | null>(
    hasVariants ? (product.variants.find((v) => v.stockQty > 0) ?? product.variants[0]).label : null,
  );
  const [quantity, setQuantity] = useState(1);
  const add = useCart((s) => s.add);
  const openCart = useUI((s) => s.openCart);
  const setWhatsappProduct = useUI((s) => s.setWhatsappProduct);
  const setStickyBar = useUI((s) => s.setStickyBar);
  const track = useRecentlyViewed((s) => s.track);
  const hydrated = useHydrated();
  const saved = useWishlist(selectIsWishlisted(product.id)) && hydrated;
  const toggleWishlist = useWishlist((s) => s.toggle);
  const row = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  const stock = hasVariants ? (product.variants.find((v) => v.label === variant)?.stockQty ?? 0) : product.stockQty;
  const soldOut = stock <= 0 || product.price === null;
  const max = Math.max(1, Math.min(stock, MAX_QUANTITY));
  const qty = Math.min(quantity, max);

  useEffect(() => {
    track(product.slug);
    setWhatsappProduct({ name: product.name, url });
    return () => setWhatsappProduct(null);
  }, [product.slug, product.name, url, track, setWhatsappProduct]);

  // Sticky bar (mobile): show once the main button row has scrolled above the
  // viewport. A scroll listener rather than IntersectionObserver: a fast fling
  // can jump from below the row to above it without ever "intersecting".
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      const visible = el.getBoundingClientRect().bottom < 0;
      setShowBar(visible);
      setStickyBar(visible && window.matchMedia("(max-width: 1023px)").matches);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      setStickyBar(false);
    };
  }, [setStickyBar]);

  const addToCart = () => {
    if (soldOut) return;
    add({ productId: product.id, slug: product.slug, variantLabel: variant }, qty);
    openCart();
  };

  const availability = soldOut ? "Sold out" : stock <= 2 ? `Only ${stock} left` : "In stock";

  return (
    <div>
      {hasVariants ? (
        <div className="mt-6" role="radiogroup" aria-label="Colour">
          <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-ink/70 uppercase">Colour</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const out = v.stockQty <= 0;
              return (
                <button
                  key={v.label}
                  type="button"
                  role="radio"
                  aria-checked={variant === v.label}
                  aria-label={`${v.label}${out ? ", sold out" : ""}`}
                  onClick={() => setVariant(v.label)}
                  className={cn(
                    "min-h-11 min-w-16 rounded-xs border px-4 text-body-sm transition-colors duration-300",
                    variant === v.label ? "border-ink text-ink" : "border-mist text-ink/80 hover:border-ink/50",
                    out && "text-ink/40 line-through",
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-1 text-body-sm">
        <p className={cn("font-medium", soldOut ? "text-plum" : "text-ink")}>{availability}</p>
        <p className="text-ink/75">Delivered in 7–10 working days</p>
        <PincodeCheck slug={product.slug} quantity={qty} />
      </div>

      <div ref={row} className="mt-5 flex items-stretch gap-2">
        <QuantityStepper value={qty} onChange={setQuantity} max={max} label={`Quantity of ${product.name}`} className={soldOut ? "opacity-40" : undefined} />
        <Button onClick={addToCart} disabled={soldOut} className="flex-1">
          {soldOut ? "Sold out" : "Add to cart"}
        </Button>
        <IconButton
          label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={saved}
          onClick={() => toggleWishlist({ productId: product.id, slug: product.slug })}
          className="border border-mist"
        >
          <Icon icon={Heart} size={18} fill={saved ? "currentColor" : "none"} />
        </IconButton>
      </div>
      {soldOut ? (
        <a
          href={whatsappUrl(whatsappNumber, { name: product.name, url })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-body-sm text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
        >
          Ask on WhatsApp
        </a>
      ) : null}

      {/* Mobile sticky bar */}
      <div
        aria-hidden={!showBar}
        inert={!showBar}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-mist bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[opacity,visibility] duration-300 lg:hidden",
          showBar ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm text-ink">{product.name}</p>
          <Price amount={product.price} className="text-caption text-ink/70" />
        </div>
        <Button onClick={addToCart} disabled={soldOut} className="shrink-0 px-5">
          {soldOut ? "Sold out" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
