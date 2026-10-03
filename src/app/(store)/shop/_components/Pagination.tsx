import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { hrefWith, type Filters } from "@/lib/collection/params";

/** Pages to show: all when few, otherwise first, last and neighbours with gaps. */
function pages(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = new Set([1, count, current - 1, current, current + 1].filter((n) => n >= 1 && n <= count));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? (["gap", n] as const) : [n]));
}

/** ‹ 1 2 3 › — page number lives in the URL (?page=2). No infinite scroll. */
export function Pagination({ path, filters, pageCount }: { path: string; filters: Filters; pageCount: number }) {
  if (pageCount <= 1) return null;
  const current = filters.page;
  const href = (page: number) => hrefWith(path, { ...filters, page });
  const cell = "flex size-11 items-center justify-center text-body-sm tabular-nums";

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
      {current > 1 ? (
        <Link href={href(current - 1)} aria-label="Previous page" className={cn(cell, "text-ink hover:opacity-70")}>
          <Icon icon={ChevronLeft} size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(cell, "text-ink/25")}>
          <Icon icon={ChevronLeft} size={18} />
        </span>
      )}
      {pages(current, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className={cn(cell, "text-ink/50")}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-label={`Page ${p}`}
            aria-current={p === current ? "page" : undefined}
            className={cn(cell, p === current ? "border-b border-ink text-ink" : "text-ink/70 hover:text-ink")}
          >
            {p}
          </Link>
        ),
      )}
      {current < pageCount ? (
        <Link href={href(current + 1)} aria-label="Next page" className={cn(cell, "text-ink hover:opacity-70")}>
          <Icon icon={ChevronRight} size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(cell, "text-ink/25")}>
          <Icon icon={ChevronRight} size={18} />
        </span>
      )}
    </nav>
  );
}
