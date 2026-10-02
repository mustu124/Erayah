import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xs border border-mist bg-paper px-3 text-body text-ink placeholder:text-ink/45 focus:border-ink",
        className,
      )}
      {...props}
    />
  );
}
