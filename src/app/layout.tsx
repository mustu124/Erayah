import type { Metadata } from "next";

import { fontBody, fontHeading, fontScript } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: {
    default: "Erayah — Heirlooms, Reimagined",
    template: "%s · Erayah",
  },
  description:
    "Handcrafted 22kt gold-plated jewellery in kundan, jadau and polki. Heirlooms, reimagined.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${fontHeading.variable} ${fontBody.variable} ${fontScript.variable} antialiased`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
