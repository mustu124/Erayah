import { cn } from "@/lib/cn";

import { ELEPHANT, TAGLINE, WORDMARK } from "./logo-paths";

type MarkProps = { className?: string; title?: string };

function Mark({ shape, className, title }: MarkProps & { shape: { viewBox: string; d: string } }) {
  return (
    <svg
      viewBox={shape.viewBox}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn("block", className)}
    >
      <path fillRule="evenodd" d={shape.d} />
    </svg>
  );
}

/** The ERAYAH wordmark. Size it by width or height; colour follows `currentColor`. */
export function Wordmark({ className, title = "Erayah" }: MarkProps) {
  return <Mark shape={WORDMARK} className={className} title={title} />;
}

/** The elephant mark, assembled from jadau-like segments. */
export function ElephantMark({ className, title }: MarkProps) {
  return <Mark shape={ELEPHANT} className={className} title={title} />;
}

/** "HEIRLOOMS, REIMAGINED" set as in the logo lock-up. */
export function Tagline({ className, title = "Heirlooms, Reimagined" }: MarkProps) {
  return <Mark shape={TAGLINE} className={className} title={title} />;
}
