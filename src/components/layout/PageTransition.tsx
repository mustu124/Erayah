"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ElephantMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

/** Fast navigations never show the elephant; it appears only if the next page takes this long. */
const SHOW_AFTER_MS = 250;
/** Never left on screen if a navigation is abandoned. */
const GIVE_UP_AFTER_MS = 10_000;

/**
 * Between pages: when a link to another page is followed and the page hasn't
 * arrived yet, the elephant mark fades in over the page until it does.
 */
export function PageTransition() {
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const pending = target !== null && target !== pathname;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      // Only real page changes: filters, sorting and pagination keep the same path.
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setTarget(url.pathname);
    };
    const reset = () => setTarget(null);
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", reset);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", reset);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const giveUp = setTimeout(() => setTarget(null), GIVE_UP_AFTER_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
      setVisible(false);
    };
  }, [pending]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-paper-warm/80 transition-opacity duration-300",
        pending && visible ? "opacity-100" : "opacity-0",
      )}
    >
      {pending && visible ? (
        <>
          <ElephantMark className="h-16 w-auto animate-pulse text-gold" />
          <span className="sr-only">Loading</span>
        </>
      ) : null}
    </div>
  );
}
