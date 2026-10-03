import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type AccordionProps = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** "lg": large light uppercase (menus). "md": small uppercase with a hairline (product details). "sm": small bold uppercase (nested). */
  size?: "lg" | "md" | "sm";
  className?: string;
};

/** Disclosure built on <details>, with + / − toggles. Keyboard and screen-reader friendly by default. */
export function Accordion({ title, children, defaultOpen, size = "lg", className }: AccordionProps) {
  return (
    <details open={defaultOpen} className={cn(size === "md" && "border-b border-mist", className)}>
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-ink [&::-webkit-details-marker]:hidden",
          size === "lg" && "text-body-lg font-light tracking-[0.12em] uppercase",
          size === "md" && "min-h-14 text-[12px] font-medium tracking-[0.14em] uppercase",
          size === "sm" && "text-[11px] font-semibold tracking-[0.14em] uppercase",
        )}
      >
        <span>{title}</span>
        <Icon icon={Plus} size={16} className="[[open]>summary>&]:hidden" />
        <Icon icon={Minus} size={16} className="hidden [[open]>summary>&]:block" />
      </summary>
      <div className={size === "md" ? "pb-6" : "pb-2"}>{children}</div>
    </details>
  );
}
