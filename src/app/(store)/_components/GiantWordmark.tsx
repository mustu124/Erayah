import { cn } from "@/lib/cn";

/** ERAYAH set huge and very faint, behind a section (as in the reference layout). */
export function GiantWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 text-center font-heading text-[22vw] leading-none tracking-[0.02em] whitespace-nowrap text-ink/[0.05] select-none",
        className,
      )}
    >
      ERAYAH
    </span>
  );
}
