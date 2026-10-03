import type { ReactNode } from "react";

import { StoreShell } from "@/components/layout/StoreShell";

/** The shell around every storefront page. */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return <StoreShell>{children}</StoreShell>;
}
