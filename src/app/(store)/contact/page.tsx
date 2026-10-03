import { Clock, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";

import { InstagramGlyph, WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { Icon } from "@/components/ui/Icon";
import { getContactDetails } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { whatsappUrl } from "@/lib/whatsapp";

import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Message Erayah on WhatsApp, or write to us. We're happy to help with orders, gifting and care.",
  alternates: { canonical: routes.contact },
};

const row = "flex min-h-14 items-center gap-4 border-b border-mist text-body text-ink";

export default async function ContactPage() {
  const c = await getContactDetails();
  const phoneDigits = c.phone?.replace(/[^\d+]/g, "");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-14 pb-24 md:px-6 lg:px-10 lg:pt-20">
      <header className="max-w-2xl">
        <p className="text-[11px] font-medium tracking-[0.18em] text-gold uppercase">Contact</p>
        <h1 className="mt-4 font-heading text-[36px] leading-[1.15] text-ink lg:text-[52px]">We&apos;re here to help.</h1>
        <p className="mt-4 text-body-lg text-ink/75">Questions about a piece, an order or a gift. WhatsApp is the quickest way to reach us.</p>
      </header>

      <div className="mt-12 grid gap-14 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <section aria-labelledby="reach-us">
          <h2 id="reach-us" className="sr-only">
            Ways to reach us
          </h2>
          <a
            href={whatsappUrl(c.whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xs bg-ink px-6 text-[13px] font-medium tracking-[0.12em] text-ivory uppercase transition-opacity duration-300 hover:opacity-90"
          >
            <WhatsAppGlyph size={22} />
            Message us on WhatsApp
          </a>
          <ul className="mt-6 border-t border-mist">
            {c.email ? (
              <li>
                <a href={`mailto:${c.email}`} className={row}>
                  <Icon icon={Mail} size={18} className="text-gold" />
                  <span className="break-all">{c.email}</span>
                </a>
              </li>
            ) : null}
            {c.phone ? (
              <li>
                <a href={`tel:${phoneDigits}`} className={row}>
                  <Icon icon={Phone} size={18} className="text-gold" />
                  {c.phone}
                </a>
              </li>
            ) : null}
            <li>
              <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className={row}>
                <InstagramGlyph size={18} className="text-gold" />
                {c.instagramHandle}
              </a>
            </li>
            {c.businessHours ? (
              <li className={row}>
                <Icon icon={Clock} size={18} className="text-gold" />
                <span>
                  {c.businessHours}
                  <span className="block text-caption text-ink/60">India time</span>
                </span>
              </li>
            ) : null}
          </ul>
        </section>

        <section aria-labelledby="write-to-us">
          <h2 id="write-to-us" className="font-heading text-h2 text-ink">
            Write to us
          </h2>
          <p className="mt-2 mb-6 text-body-sm text-ink/70">Leave an email or phone number and we&apos;ll get back to you.</p>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
