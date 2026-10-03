import type { Metadata } from "next";

import { NotFoundContent } from "@/components/content/NotFoundContent";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

/** notFound() inside the storefront (an unknown product, collection or order). */
export default function StoreNotFound() {
  return <NotFoundContent />;
}
