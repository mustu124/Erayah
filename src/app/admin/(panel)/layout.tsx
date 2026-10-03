import type { ReactNode } from "react";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireAdminPage } from "@/lib/admin/auth";

// Admin pages are per request (they read the session), so they block on the
// server rather than prerender; see docs/DECISIONS.md.
export const instant = false;

async function Nav() {
  const admin = await requireAdminPage();
  return <AdminNav role={admin.role} email={admin.email} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex">
      <Suspense fallback={<div className="hidden w-60 shrink-0 border-r border-mist bg-paper lg:block" />}>
        <Nav />
      </Suspense>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}
