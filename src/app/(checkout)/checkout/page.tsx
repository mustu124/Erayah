import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { publicEnv } from "@/lib/env/public";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutForm whatsappNumber={publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER} />;
}
