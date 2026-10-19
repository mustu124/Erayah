import { Montserrat, STIX_Two_Text } from "next/font/google";

export const fontHeading = STIX_Two_Text({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-stix",
  display: "swap",
});

export const fontBody = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

// Highlight script: the brand calls for Sloop, which we don't have yet. Until
// then --font-script uses STIX Two Text Italic from fontHeading above (the
// local TTF in src/fonts is only for the invoice PDF). When Sloop arrives, add
// it here with localFont({ variable: "--font-sloop" }) and point --font-script at it.
