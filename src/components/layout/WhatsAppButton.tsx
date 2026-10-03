"use client";

import { WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/cn";
import { whatsappUrl } from "@/lib/whatsapp";
import { useUI } from "@/stores/ui";

/** Round ink button fixed bottom-right on every storefront page. */
export function WhatsAppButton({ number }: { number: string }) {
  const product = useUI((s) => s.whatsappProduct);
  const stickyBar = useUI((s) => s.stickyBar);

  return (
    <a
      href={whatsappUrl(number, product)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={product ? `Ask Erayah about the ${product.name} on WhatsApp` : "Chat with Erayah on WhatsApp"}
      className={cn(
        "fixed right-[max(1rem,env(safe-area-inset-right))] z-30 flex size-[52px] items-center justify-center rounded-full bg-ink text-paper shadow-[0_6px_18px_rgb(49_24_41/0.3)] ring-1 ring-ivory/40 transition-[opacity,bottom] duration-300 hover:opacity-90",
        // Sit above the mobile sticky add-to-cart bar when it shows.
        stickyBar ? "bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]" : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      <WhatsAppGlyph size={24} />
    </a>
  );
}
