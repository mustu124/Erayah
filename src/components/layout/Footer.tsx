import Link from "next/link";
import { Fragment } from "react";

import { InstagramGlyph, WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { ElephantMark, Wordmark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { CurrentYear } from "@/components/ui/Today";
import { CATEGORY_LINKS, FOOTER_ERAYAH_LINKS, FOOTER_HELP_LINKS, type NavLink } from "@/lib/navigation";
import { routes } from "@/lib/routes";
import { whatsappUrl } from "@/lib/whatsapp";

type FooterProps = { instagramUrl: string; whatsappNumber: string };

// The band of elephants and dots: 4 across on a phone, 8 on a tablet, 12 on desktop,
// spread edge to edge so the spacing is even at every width.
const BAND_ELEPHANTS = 12;
const shownFrom = (i: number) => (i < 4 ? "" : i < 8 ? "hidden md:block" : "hidden lg:block");

const LINK = "flex min-h-11 items-center text-body-sm text-ivory/85 transition-opacity duration-300 hover:text-ivory lg:min-h-9";

export async function Footer({ instagramUrl, whatsappNumber }: FooterProps) {

  return (
    <footer className="bg-ink text-ivory">
      {/* Brand pattern from the guidelines: elephants and dots, very faint. */}
      <div aria-hidden="true" className="flex h-10 items-center justify-between px-6 text-ivory opacity-[0.12] md:px-10">
        {Array.from({ length: BAND_ELEPHANTS }, (_, i) => (
          <Fragment key={i}>
            <ElephantMark className={cn("h-5 w-auto shrink-0", shownFrom(i))} />
            {i < BAND_ELEPHANTS - 1 ? <span className={cn("size-[3px] shrink-0 rounded-full bg-current", shownFrom(i + 1))} /> : null}
          </Fragment>
        ))}
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 pt-10 pb-14 md:px-10 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-10 lg:pt-14 lg:pb-20">
        <div>
          <Link href={routes.home} aria-label="Erayah, home" className="inline-block">
            <Wordmark title="" className="h-9 w-auto text-ivory md:h-12" />
          </Link>
          <p className="mt-5 font-heading text-h3 text-ivory/90 italic">Heirlooms, Reimagined.</p>
        </div>

        <FooterColumn title="Shop" links={[...CATEGORY_LINKS, { label: "Shop All", href: routes.shopAll }]} className="hidden lg:block" />
        <FooterColumn title="Help" links={FOOTER_HELP_LINKS} />
        <FooterColumn title="Erayah" links={FOOTER_ERAYAH_LINKS} />

        <nav aria-labelledby="footer-follow">
          <h2 id="footer-follow" className="font-body text-label font-medium text-ivory/60 uppercase">
            Follow
          </h2>
          <ul className="mt-4">
            <li>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} gap-3`}>
                <InstagramGlyph size={16} />
                Instagram
              </a>
            </li>
            <li>
              <a href={whatsappUrl(whatsappNumber)} target="_blank" rel="noopener noreferrer" className={`${LINK} gap-3`}>
                <WhatsAppGlyph size={16} />
                WhatsApp
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-ivory/15">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-6 py-6 text-caption text-ivory/70 md:flex-row md:justify-between md:px-10 md:pr-24">
          <p>
            © <CurrentYear /> Erayah
          </p>
          <p>Handcrafted in India</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links, className }: { title: string; links: NavLink[]; className?: string }) {
  const id = `footer-${title.toLowerCase()}`;
  return (
    <nav aria-labelledby={id} className={className}>
      <h2 id={id} className="font-body text-label font-medium text-ivory/60 uppercase">
        {title}
      </h2>
      <ul className="mt-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={LINK}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
