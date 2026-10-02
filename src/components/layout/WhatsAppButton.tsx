"use client";

import { WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { whatsappUrl } from "@/lib/whatsapp";
import { useUI } from "@/stores/ui";

/** Round ink button fixed bottom-right on every storefront page. */
export function WhatsAppButton({ number }: { number: string }) {
  const topic = useUI((s) => s.whatsappTopic);

  return (
    <a
      href={whatsappUrl(number, topic)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={topic ? `Ask Erayah about the ${topic} on WhatsApp` : "Chat with Erayah on WhatsApp"}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex size-[52px] items-center justify-center rounded-full bg-ink text-paper ring-1 ring-ivory/40 shadow-[0_6px_18px_rgb(49_24_41/0.3)] transition-opacity duration-300 hover:opacity-90"
    >
      <WhatsAppGlyph size={24} />
    </a>
  );
}
