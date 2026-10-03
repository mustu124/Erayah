"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/Icon";

/** Copies text (an address, an order number) to the clipboard. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("Copied.");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it instead.");
        }
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-xs border border-mist px-3 text-caption text-ink hover:border-ink/40"
    >
      <Icon icon={done ? Check : Copy} size={14} />
      {label}
    </button>
  );
}
