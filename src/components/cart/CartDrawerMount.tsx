"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/use-hydrated";
import { selectCartCount, useCart } from "@/stores/cart";
import { useUI } from "@/stores/ui";

/**
 * Where the cart drawer lives in the shell. The full cart (lines, totals,
 * gift note, shipping estimate, cross-sells) replaces this body in Prompt 9.
 */
export function CartDrawerMount() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const hydrated = useHydrated();
  const count = useCart(selectCartCount);

  return (
    <Drawer open={open} onClose={close} side="right" title={`My cart${hydrated && count ? ` · ${count}` : ""}`}>
      <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <p className="font-heading text-h3 text-ink">
          {hydrated && count ? `${count} ${count === 1 ? "piece" : "pieces"} in your cart` : "Your cart is empty"}
        </p>
        <ButtonLink href={routes.shopAll} onClick={close}>
          Shop All
        </ButtonLink>
      </div>
    </Drawer>
  );
}
