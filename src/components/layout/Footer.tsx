import Link from "next/link";

import { InstagramGlyph, WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { Wordmark } from "@/components/ui/Logo";
import { currentYear } from "@/lib/format/date";
import { CATEGORY_LINKS, FOOTER_ERAYAH_LINKS, FOOTER_HELP_LINKS, type NavLink } from "@/lib/navigation";
import { routes } from "@/lib/routes";
import { whatsappUrl } from "@/lib/whatsapp";

type FooterProps = { instagramUrl: string; whatsappNumber: string };

const LINK = "flex min-h-11 items-center text-body-sm text-ivory/85 transition-opacity duration-300 hover:text-ivory lg:min-h-9";

export async function Footer({ instagramUrl, whatsappNumber }: FooterProps) {
  const year = await currentYear();

  return (
    <footer className="bg-ink text-ivory">
      {/* Brand pattern from the guidelines: elephants and dots, very faint. */}
      <div aria-hidden="true" className="h-10 bg-[url(/brand/elephant-pattern.svg)] bg-[length:96px_40px] bg-center bg-repeat-space opacity-[0.12]" />

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
          <p>© {year} Erayah</p>
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
