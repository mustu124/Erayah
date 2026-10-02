"use client";

import { Heart, ShoppingBag, X } from "lucide-react";
import Link from "next/link";

import { Accordion } from "@/components/ui/Accordion";
import { InstagramGlyph, WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { CountBadge, IconButton } from "@/components/ui/IconButton";
import { ElephantMark } from "@/components/ui/Logo";
import { CATEGORY_LINKS, DISCOVER_LINKS, STYLE_LINKS } from "@/lib/navigation";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/use-hydrated";
import { whatsappUrl } from "@/lib/whatsapp";
import { selectCartCount, useCart } from "@/stores/cart";
import { useUI } from "@/stores/ui";

type MobileMenuProps = { instagramUrl: string; whatsappNumber: string };

const BOLD_LINK = "flex min-h-11 items-center text-[11px] font-semibold tracking-[0.14em] text-ink uppercase";
const SUB_LINK = "flex min-h-11 items-center text-body-lg font-light text-ink";
const BIG_LINK = "flex min-h-14 items-center text-body-lg font-light tracking-[0.12em] text-ink uppercase";

/** Full-height left drawer: elephant mark, Shop accordion, About / Contact / FAQs. */
export function MobileMenu({ instagramUrl, whatsappNumber }: MobileMenuProps) {
  const open = useUI((s) => s.menuOpen);
  const close = useUI((s) => s.closeMenu);
  const openCart = useUI((s) => s.openCart);
  const hydrated = useHydrated();
  const cartCount = useCart(selectCartCount);
  const cart = hydrated ? cartCount : 0;

  const header = (
    <div className="flex min-h-16 items-center justify-between px-4">
      <Link href={routes.home} onClick={close} aria-label="Erayah, home" className="flex size-11 items-center">
        <ElephantMark className="h-9 w-auto text-ink" />
      </Link>
      <div className="flex items-center">
        <IconButton label={cart ? `Cart, ${cart} items` : "Cart"} onClick={openCart}>
          <Icon icon={ShoppingBag} />
          <CountBadge count={cart} />
        </IconButton>
        <IconButton label="Close menu" onClick={close} className="-mr-2">
          <Icon icon={X} size={22} />
        </IconButton>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onClose={close} side="left" title="Menu" header={header} className="lg:hidden">
      <nav aria-label="Mobile" className="flex min-h-full flex-col px-5 pb-6">
        <Accordion title="Shop" defaultOpen className="border-b border-mist pb-2">
          <ul className="mb-1">
            {DISCOVER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={close} className={BOLD_LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Accordion title="Category" size="sm">
            <ul className="pl-1">
              {[{ label: "All", href: routes.shopAll }, ...CATEGORY_LINKS].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className={SUB_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Accordion>
          <Accordion title="Style" size="sm">
            <ul className="pl-1">
              {STYLE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className={SUB_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Accordion>
        </Accordion>

        <ul>
          {[
            { label: "About Erayah", href: routes.about },
            { label: "Contact", href: routes.contact },
            { label: "FAQs", href: routes.faqs },
          ].map((link) => (
            <li key={link.href} className="border-b border-mist">
              <Link href={link.href} onClick={close} className={BIG_LINK}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-2 pt-10">
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Erayah on Instagram" className="flex size-11 items-center justify-center text-ink">
            <InstagramGlyph size={20} />
          </a>
          <a
            href={whatsappUrl(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with Erayah on WhatsApp"
            className="flex size-11 items-center justify-center text-ink"
          >
            <WhatsAppGlyph size={20} />
          </a>
          <Link href={routes.wishlist} onClick={close} className="ml-auto flex min-h-11 items-center gap-2 text-body-sm text-ink">
            <Icon icon={Heart} size={18} />
            Wishlist
          </Link>
        </div>
      </nav>
    </Drawer>
  );
}
