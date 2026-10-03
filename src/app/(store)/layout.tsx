import type { ReactNode } from "react";

import { CartDrawerMount } from "@/components/cart/CartDrawerMount";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HistoryFlag } from "@/components/layout/HistoryFlag";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { getMenuFeature, getSiteShell } from "@/lib/data/site";

/** The shell around every storefront page. */
export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [shell, feature] = await Promise.all([getSiteShell(), getMenuFeature()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 bg-ink px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {shell.announcementText ? <AnnouncementBar text={shell.announcementText} /> : null}
      <Header feature={feature} instagramUrl={shell.instagramUrl} whatsappNumber={shell.whatsappNumber} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer instagramUrl={shell.instagramUrl} whatsappNumber={shell.whatsappNumber} />
      <WhatsAppButton number={shell.whatsappNumber} />
      <CartDrawerMount />
      <HistoryFlag />
    </div>
  );
}
