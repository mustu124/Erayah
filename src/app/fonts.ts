import { Montserrat, STIX_Two_Text } from "next/font/google";
import localFont from "next/font/local";

export const fontHeading = STIX_Two_Text({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-stix",
  display: "swap",
});

export const fontBody = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-montserrat",
  display: "swap",
});

// Highlight script. The brand calls for Sloop, which we don't have yet; until
// its file is added to src/fonts, this uses the brand's alternative
// (STIX Two Text Italic). Swap `src` when Sloop arrives.
export const fontScript = localFont({
  src: "../fonts/STIXTwoText-Italic.ttf",
  style: "italic",
  variable: "--font-sloop",
  display: "swap",
});
