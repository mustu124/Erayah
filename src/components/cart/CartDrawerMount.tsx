"use client";

import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { ElephantMark } from "@/components/ui/Logo";
import { Price } from "@/components/ui/Price";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/use-hydrated";
import { useProductCards } from "@/lib/use-product-cards";
import { lineKey, MAX_QUANTITY, selectCartCount, useCart } from "@/stores/cart";
import { useUI } from "@/stores/ui";

/**
 * The cart, as a right-side drawer: each piece with its photo, name and price,
 * a quantity stepper and Remove, then the subtotal and Checkout. Prices shown
 * here are for reading only; checkout recomputes everything on the server.
 */
export function CartDrawerMount() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const hydrated = useHydrated();
  const storedLines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const count = useCart(selectCartCount);

  const lines = hydrated ? storedLines : [];
  const { cards, loading } = useProductCards(lines.map((l) => l.slug));
  const subtotal = lines.reduce((sum, l) => sum + (cards.get(l.slug)?.price ?? 0) * l.quantity, 0);
  const priced = lines.every((l) => cards.has(l.slug));

  const footer = lines.length ? (
    <div>
      <div className="flex items-baseline justify-between text-body text-ink">
        <span className="text-label font-medium uppercase">Subtotal</span>
        {priced ? <Price amount={subtotal} className="font-medium" /> : <span className="text-ink/50">…</span>}
      </div>
      <p className="mt-1 text-caption text-ink/65">Shipping is calculated at checkout.</p>
      <ButtonLink href={routes.checkout} onClick={close} className="mt-4 w-full">
        Checkout
      </ButtonLink>
      <button type="button" onClick={close} className="mx-auto mt-1 flex min-h-11 items-center text-body-sm text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
        Continue shopping
      </button>
    </div>
  ) : undefined;

  return (
    <Drawer open={open} onClose={close} side="right" title={`My cart${lines.length ? ` · ${count}` : ""}`} footer={footer}>
      {lines.length ? (
        <ul className="divide-y divide-mist px-4">
          {lines.map((line) => {
            const key = lineKey(line);
            const card = cards.get(line.slug);
            const name = card?.name ?? (loading ? "…" : "This piece is no longer available");
            return (
              <li key={key} className="flex gap-4 py-5">
                <Link href={routes.product(line.slug)} onClick={close} className="relative block aspect-[4/5] w-20 shrink-0 overflow-hidden bg-ivory" tabIndex={-1} aria-hidden="true">
                  {card?.image ? (
                    <Image src={card.image.url} alt="" fill sizes="80px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <ElephantMark className="h-6 w-auto text-ink/10" />
                    </span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={routes.product(line.slug)} onClick={close} className="block text-body-sm leading-snug text-ink hover:underline">
                        {name}
                      </Link>
                      {line.variantLabel ? <p className="mt-0.5 text-caption text-ink/65">{line.variantLabel}</p> : null}
                      <Price amount={card?.price ?? null} className="mt-1 block text-body-sm text-ink/75" />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      aria-label={`Remove ${card?.name ?? "this piece"} from cart`}
                      className="-mt-2.5 -mr-3 flex size-11 shrink-0 items-center justify-center text-ink/60 transition-colors duration-300 hover:text-ink"
                    >
                      <Icon icon={X} size={16} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(n) => setQuantity(key, n)}
                      max={MAX_QUANTITY}
                      label={`Quantity of ${card?.name ?? "this piece"}`}
                    />
                    <button type="button" onClick={() => remove(key)} className="flex min-h-11 items-center text-caption text-ink/70 underline decoration-ink/30 underline-offset-4 hover:text-ink">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
          <ElephantMark className="h-10 w-auto text-gold" />
          <p className="font-heading text-h3 text-ink">Your cart is empty</p>
          <ButtonLink href={routes.shopAll} onClick={close}>
            Shop All
          </ButtonLink>
        </div>
      )}
    </Drawer>
  );
}
