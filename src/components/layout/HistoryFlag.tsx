"use client";

import { useEffect } from "react";

export const POP_FLAG = "erayah:popstate";

/**
 * Notes when the shopper used the browser's back/forward buttons, so pages
 * that remember scroll position (collections) know to restore it.
 */
export function HistoryFlag() {
  useEffect(() => {
    const onPop = () => {
      try {
        sessionStorage.setItem(POP_FLAG, String(Date.now()));
      } catch {
        // Storage unavailable: nothing to remember.
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return null;
}
