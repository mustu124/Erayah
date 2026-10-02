import Link from "next/link";

import { Wordmark } from "@/components/ui/Logo";
import type { MenuFeature } from "@/lib/data/site";
import { routes } from "@/lib/routes";

import { DesktopNav } from "./DesktopNav";
import { HeaderActions } from "./HeaderActions";
import { MobileMenu } from "./MobileMenu";
import { SearchForm } from "./SearchForm";

type HeaderProps = {
  feature: MenuFeature;
  instagramUrl: string;
  whatsappNumber: string;
};

/**
 * Desktop: wordmark, SHOP / ABOUT / CONTACT / FAQS, wide search, wishlist, cart.
 * Mobile: wordmark, cart, menu; the search field sits on its own row below.
 */
export function Header({ feature, instagramUrl, whatsappNumber }: HeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-mist bg-paper-warm">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 md:px-6 lg:h-[72px] lg:px-10">
          <Link href={routes.home} aria-label="Erayah, home" className="shrink-0">
            <Wordmark title="" className="h-[17px] w-auto text-ink lg:h-5" />
          </Link>
          <DesktopNav feature={feature} />
          <div className="ml-auto flex items-center gap-4 lg:flex-1 lg:justify-end">
            <SearchForm id="search-desktop" className="hidden max-w-xl lg:flex" />
            <HeaderActions />
          </div>
        </div>
      </header>
      <div className="border-b border-mist bg-paper-warm px-4 py-3 md:px-6 lg:hidden">
        <SearchForm id="search-mobile" />
      </div>
      <MobileMenu instagramUrl={instagramUrl} whatsappNumber={whatsappNumber} />
    </>
  );
}
