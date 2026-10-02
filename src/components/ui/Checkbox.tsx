import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode };

/** Square checkbox with a full-row 44px tap target. */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-ink", className)}>
      <input
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer rounded-none border-mist accent-ink"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
