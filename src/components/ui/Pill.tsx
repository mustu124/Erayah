import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Rounded label, translucent ivory so it sits softly on photographs. */
export function Pill({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-paper/60 bg-ivory/75 px-4 py-1.5 text-body-sm text-ink backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
