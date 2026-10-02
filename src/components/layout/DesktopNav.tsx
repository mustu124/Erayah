"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ElephantMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import type { MenuFeature } from "@/lib/data/site";
import { IVORY_BLUR } from "@/lib/images";
import { CATEGORY_LINKS, DISCOVER_LINKS, PRIMARY_LINKS, STYLE_LINKS, type NavLink } from "@/lib/navigation";
import { routes } from "@/lib/routes";

const NAV_LINK = "flex h-11 items-center text-[11px] font-medium tracking-[0.16em] text-ink uppercase transition-opacity duration-300 hover:opacity-70";

/** SHOP (with its full-width mega-menu), ABOUT, CONTACT, FAQS. Desktop only. */
export function DesktopNav({ feature }: { feature: MenuFeature }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) hide();
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          // Keyboard (Enter/Space, detail 0) toggles; a mouse click keeps the hover-opened menu open.
          onClick={(event) => (event.detail === 0 ? setOpen((v) => !v) : show())}
          className={NAV_LINK}
        >
          Shop
        </button>

        <div
          id={panelId}
          className={cn(
            "absolute inset-x-0 top-full border-t border-mist bg-paper-warm shadow-[0_18px_30px_-18px_rgb(49_24_41/0.25)] transition-[opacity,visibility] duration-300",
            open ? "visible opacity-100" : "invisible opacity-0",
          )}
        >
          <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_1fr_1fr_1.1fr] gap-10 px-10 pt-8 pb-10">
            <MenuColumn title="Shop by Category" links={[...CATEGORY_LINKS, { label: "Shop All", href: routes.shopAll }]} onNavigate={() => setOpen(false)} />
            <MenuColumn title="Discover" links={DISCOVER_LINKS} onNavigate={() => setOpen(false)} />
            <MenuColumn title="Shop by Style" links={STYLE_LINKS} onNavigate={() => setOpen(false)} />
            <FeatureTile feature={feature} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </div>

      {PRIMARY_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={NAV_LINK}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function MenuColumn({ title, links, onNavigate }: { title: string; links: NavLink[]; onNavigate: () => void }) {
  return (
    <div>
      <h2 className="border-b border-gold/50 pb-3 font-body text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">{title}</h2>
      <ul className="mt-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className="flex min-h-9 items-center text-body font-light text-ink transition-opacity duration-300 hover:opacity-60"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureTile({ feature, onNavigate }: { feature: MenuFeature; onNavigate: () => void }) {
  return (
    <Link href={feature.href} onClick={onNavigate} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-ivory">
        {feature.imageUrl ? (
          <Image
            src={feature.imageUrl}
            alt={feature.alt}
            fill
            sizes="(min-width: 1440px) 340px, 24vw"
            placeholder="blur"
            blurDataURL={IVORY_BLUR}
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ElephantMark className="h-20 w-auto text-ink/15" />
          </div>
        )}
      </div>
      <p className="mt-3 text-body-sm text-ink underline decoration-ink/40 underline-offset-4 group-hover:decoration-ink">
        {feature.caption}
      </p>
    </Link>
  );
}
