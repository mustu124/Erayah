import type { Metadata } from "next";

import { WishlistGrid } from "./WishlistGrid";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "The Erayah pieces you have saved on this device.",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-12 pb-24 md:px-6 lg:px-10 lg:pt-16">
      <header className="text-center">
        <h1 className="font-heading text-[34px] leading-[1.15] text-ink lg:text-[48px]">Wishlist</h1>
        <p className="mt-3 text-body-sm text-ink/65">Saved on this device.</p>
      </header>
      <WishlistGrid />
    </div>
  );
}
