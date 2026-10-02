import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type AccordionProps = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** "lg": large light uppercase (top level). "sm": small bold uppercase (nested). */
  size?: "lg" | "sm";
  className?: string;
};

/** Disclosure built on <details>, with + / − toggles. Keyboard and screen-reader friendly by default. */
export function Accordion({ title, children, defaultOpen, size = "lg", className }: AccordionProps) {
  return (
    <details open={defaultOpen} className={className}>
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-ink [&::-webkit-details-marker]:hidden",
          size === "lg" ? "text-body-lg font-light tracking-[0.12em] uppercase" : "text-[11px] font-semibold tracking-[0.14em] uppercase",
        )}
      >
        <span>{title}</span>
        <Icon icon={Plus} size={16} className="[[open]>summary>&]:hidden" />
        <Icon icon={Minus} size={16} className="hidden [[open]>summary>&]:block" />
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );
}
