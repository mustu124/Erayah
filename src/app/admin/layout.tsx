import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Toaster } from "@/components/admin/Toaster";
import { HistoryFlag } from "@/components/layout/HistoryFlag";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Erayah admin" },
  robots: { index: false, follow: false, nocache: true },
};

/** Everything under /admin (login included): off-white page, toasts. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper-warm font-body text-ink">
      {children}
      <Toaster />
      <HistoryFlag />
    </div>
  );
}
