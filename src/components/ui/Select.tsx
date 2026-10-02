import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

/** Native select (best on mobile) styled to match. Pass <option>s as children. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        className="h-11 w-full cursor-pointer appearance-none rounded-xs border border-mist bg-paper pr-10 pl-3 text-body-sm text-ink focus:border-ink"
        {...props}
      >
        {children}
      </select>
      <Icon icon={ChevronDown} size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink" />
    </div>
  );
}
