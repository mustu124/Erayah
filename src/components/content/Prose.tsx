import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/cn";

/**
 * Markdown from /admin (pages, FAQ answers), set in the brand's reading
 * style. Raw HTML is never rendered; internal links use client navigation.
 */
export function Prose({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-erayah", className)}>
      <ReactMarkdown
        components={{
          a: ({ href = "", children: text }) =>
            href.startsWith("/") ? (
              <Link href={href}>{text}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Markdown to plain text (for structured data and descriptions). */
export function markdownToText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}
