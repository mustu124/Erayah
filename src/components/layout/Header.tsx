import Link from "next/link";

import { ElephantMark, Wordmark } from "@/components/ui/Logo";
import type { MenuFeature } from "@/lib/data/site";
import { routes } from "@/lib/routes";

import { DesktopNav } from "./DesktopNav";
import { HeaderActions, MenuButton } from "./HeaderActions";
import { MobileMenu } from "./MobileMenu";
import { SearchForm } from "./SearchForm";

type HeaderProps = {
  feature: MenuFeature;
  instagramUrl: string;
  whatsappNumber: string;
};

/**
 * Desktop: elephant + wordmark on the left, SHOP / ABOUT / CONTACT / FAQS, wide search, wishlist, cart.
 * Mobile: menu on the left, elephant + wordmark in the centre, cart on the right; the search field sits on its own row below.
 */
export function Header({ feature, instagramUrl, whatsappNumber }: HeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-mist bg-paper-warm">
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 lg:flex lg:h-[72px] lg:gap-8 lg:px-10">
          <MenuButton className="-ml-2 justify-self-start lg:hidden" />
          <Link href={routes.home} aria-label="Erayah, home" className="flex shrink-0 items-end gap-2.5">
            <ElephantMark className="h-7 w-auto text-ink lg:h-8" />
            <Wordmark title="" className="h-[17px] w-auto text-ink lg:h-5" />
          </Link>
          <DesktopNav feature={feature} />
          <div className="flex items-center gap-4 justify-self-end lg:ml-auto lg:flex-1 lg:justify-end">
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
