import { Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { HistoryFlag } from "@/components/layout/HistoryFlag";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Logo";
import { routes } from "@/lib/routes";

/** Checkout keeps the page quiet: wordmark home link and a reassurance, nothing else. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-mist">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link href={routes.home} aria-label="Erayah home" className="flex min-h-11 items-center">
            <Wordmark className="h-4 w-auto text-ink lg:h-5" />
          </Link>
          <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-ink uppercase">
            <Icon icon={Lock} size={14} />
            Secure checkout
          </p>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <HistoryFlag />
    </div>
  );
}
