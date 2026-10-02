import { cn } from "@/lib/cn";

/** Placeholder block while content loads (a gentle opacity pulse). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xs bg-ivory", className)} />;
}
