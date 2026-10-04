import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { pctChange } from "@/lib/admin/analytics-util";
import { cn } from "@/lib/cn";

/**
 * "+18%" / "−5%" against the previous period of the same length. Direction is
 * written as a sign and an arrow as well as a colour.
 */
export function Delta({ cur, prev, className }: { cur: number; prev: number; className?: string }) {
  const pct = pctChange(cur, prev);
  if (pct === null) {
    return <span className={cn("text-caption text-ink/55", className)}>{cur > 0 ? "new" : "—"}</span>;
  }
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className={cn("text-caption font-medium whitespace-nowrap tabular-nums", flat ? "text-ink/60" : up ? "text-[#355a39]" : "text-[#7a3b2e]", className)}
      title="Compared with the previous period of the same length"
    >
      {flat ? "" : up ? "▲ " : "▼ "}
      {up ? "+" : pct < 0 ? "−" : ""}
      {Math.abs(pct)}%
    </span>
  );
}

/** A thin ink bar from the left baseline; `value` is 0–100 of the widest bar. */
export function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="h-3 w-full" title={label}>
      <div className="h-3 rounded-r-[4px] bg-ink transition-opacity duration-200 hover:opacity-75" style={{ width: `${Math.max(value, value > 0 ? 1 : 0)}%` }} />
    </div>
  );
}

type SectionProps = { id: string; title: string; note?: ReactNode; csv?: string | null; csvLabel?: string; children: ReactNode; actions?: ReactNode };

/** A titled panel with its "Download CSV" button. */
export function Section({ id, title, note, csv, csvLabel, children, actions }: SectionProps) {
  return (
    <section aria-labelledby={id} className="border border-mist bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist px-4 py-3 sm:px-5">
        <div>
          <h2 id={id} className="font-body text-label font-medium text-ink uppercase">
            {title}
          </h2>
          {note ? <p className="mt-1 text-caption text-ink/60">{note}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {csv ? (
            <a href={csv} download className="inline-flex min-h-9 items-center gap-1.5 rounded-xs border border-mist px-3 text-caption text-ink hover:border-ink/40" aria-label={csvLabel ?? `Download ${title} as CSV`}>
              <Icon icon={Download} size={14} />
              Download CSV
            </a>
          ) : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export const numberIN = new Intl.NumberFormat("en-IN");
