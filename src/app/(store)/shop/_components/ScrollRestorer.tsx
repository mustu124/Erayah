"use client";

import { useEffect } from "react";

import { POP_FLAG } from "@/components/layout/HistoryFlag";

const keyFor = () => `erayah:scroll:${window.location.pathname}${window.location.search}`;

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode): scroll memory is a convenience only.
  }
}

/**
 * Remembers the scroll position per full URL (path + filters + page) and,
 * when the shopper comes back with the browser's back/forward buttons,
 * restores it once the grid has rendered.
 */
export function ScrollRestorer() {
  useEffect(() => {
    const save = () => write(keyFor(), String(Math.round(window.scrollY)));

    // Restore only for back/forward navigations, not for fresh visits.
    const popped = Number(read(POP_FLAG) ?? 0);
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    // The navigation entry describes the initial document load, so only trust it right after load.
    const isHistoryNav =
      Date.now() - popped < 5000 || (navEntry?.type === "back_forward" && performance.now() < 4000);
    write(POP_FLAG, "0");

    const saved = isHistoryNav ? Number(read(keyFor()) ?? 0) : 0;
    const timers: number[] = [];
    if (saved > 0) {
      const restore = () => window.scrollTo({ top: saved, behavior: "instant" });
      // After the grid paints, and again shortly after in case the router scrolled too.
      requestAnimationFrame(() => requestAnimationFrame(restore));
      timers.push(window.setTimeout(restore, 120), window.setTimeout(restore, 400));
    }

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(save);
    };
    // Save immediately when a link is followed, before the next page renders.
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest("a")) save();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("pagehide", save);
    return () => {
      timers.forEach((t) => clearTimeout(t));
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pagehide", save);
    };
  }, []);

  return null;
}
