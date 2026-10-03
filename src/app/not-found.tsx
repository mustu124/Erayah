import type { Metadata } from "next";

import { NotFoundContent } from "@/components/content/NotFoundContent";
import { StoreShell } from "@/components/layout/StoreShell";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

/** Any URL that matches no page: the storefront 404, with the full shell. */
export default function NotFound() {
  return (
    <StoreShell>
      <NotFoundContent />
    </StoreShell>
  );
}
