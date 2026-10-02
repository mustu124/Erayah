import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  title: string;
  /** Date-style label on the right, e.g. "October 2026" (see currentMonthLabel). */
  label?: string;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
};

/** "Bestsellers ——— October 2026": title left, small label right, gold hairline between. */
export function SectionHeader({ title, label, as: Heading = "h2", id, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-4 md:gap-6", className)}>
      <Heading id={id} className="shrink-0 font-heading text-h3 text-ink md:text-h2">
        {title}
      </Heading>
      <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-gold/60" />
      {label ? <span className="shrink-0 text-label text-ink/70 uppercase">{label}</span> : null}
    </div>
  );
}
