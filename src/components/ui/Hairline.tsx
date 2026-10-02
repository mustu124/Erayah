import { cn } from "@/lib/cn";

type HairlineProps = { tone?: "mist" | "gold"; className?: string };

/** 1px divider. */
export function Hairline({ tone = "mist", className }: HairlineProps) {
  return <hr className={cn("h-px border-0", tone === "gold" ? "bg-gold/60" : "bg-mist", className)} />;
}
