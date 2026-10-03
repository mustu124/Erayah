"use client";

import { Heart } from "lucide-react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";
import { selectIsWishlisted, useWishlist } from "@/stores/wishlist";

type WishlistHeartProps = {
  productId: number;
  slug: string;
  name: string;
  className?: string;
};

/**
 * Small heart on a product card. Hidden until hover on desktop, always shown
 * softly on touch screens, and fully shown once saved (see .card-heart in globals.css).
 */
export function WishlistHeart({ productId, slug, name, className }: WishlistHeartProps) {
  const hydrated = useHydrated();
  const saved = useWishlist(selectIsWishlisted(productId)) && hydrated;
  const toggle = useWishlist((s) => s.toggle);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      onClick={() => toggle({ productId, slug })}
      className={cn("card-heart flex size-11 items-center justify-center text-ink transition-opacity duration-300", className)}
    >
      <Icon icon={Heart} size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
