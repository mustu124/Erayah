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

/** Wishlist (desktop), cart, and the menu button (mobile). */
export function HeaderActions() {
  const hydrated = useHydrated();
  const cartCount = useCart(selectCartCount);
  const wishlistCount = useWishlist(selectWishlistCount);
  const openCart = useUI((s) => s.openCart);
  const openMenu = useUI((s) => s.openMenu);

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
      <IconButton label={cart ? `Cart, ${cart} items` : "Cart"} onClick={openCart}>
        <Icon icon={ShoppingBag} />
        <CountBadge count={cart} />
      </IconButton>
      <IconButton label="Menu" onClick={openMenu} className="-mr-2 lg:hidden">
        <Icon icon={Menu} size={22} />
      </IconButton>
    </div>
  );
}
