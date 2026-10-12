"use client";

import { Heart, Menu, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { CountBadge, IconButton } from "@/components/ui/IconButton";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/use-hydrated";
import { selectCartCount, useCart } from "@/stores/cart";
import { useUI } from "@/stores/ui";
import { selectWishlistCount, useWishlist } from "@/stores/wishlist";

/** Wishlist (desktop) and cart. */
export function HeaderActions() {
  const hydrated = useHydrated();
  const cartCount = useCart(selectCartCount);
  const wishlistCount = useWishlist(selectWishlistCount);
  const openCart = useUI((s) => s.openCart);

  const cart = hydrated ? cartCount : 0;
  const wishlist = hydrated ? wishlistCount : 0;

  return (
    <div className="flex items-center">
      <Link
        href={routes.wishlist}
        aria-label={wishlist ? `Wishlist, ${wishlist} saved` : "Wishlist"}
        className="relative hidden size-11 items-center justify-center text-ink transition-opacity duration-300 hover:opacity-70 lg:inline-flex"
      >
        <Icon icon={Heart} />
        <CountBadge count={wishlist} />
      </Link>
      <IconButton label={cart ? `Cart, ${cart} items` : "Cart"} onClick={openCart} className="-mr-2 lg:mr-0">
        <Icon icon={ShoppingBag} />
        <CountBadge count={cart} />
      </IconButton>
    </div>
  );
}

/** The three-line menu button: mobile only, on the left of the header. */
export function MenuButton({ className }: { className?: string }) {
  const openMenu = useUI((s) => s.openMenu);
  return (
    <IconButton label="Menu" onClick={openMenu} className={className}>
      <Icon icon={Menu} size={22} />
    </IconButton>
  );
}
