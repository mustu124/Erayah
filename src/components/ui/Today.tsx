"use client";

import { useSyncExternalStore } from "react";

import { monthYearLabel } from "@/lib/format/date";

// The current month and year, worked out in the shopper's browser.
// Rendering them on the server would give every page a refresh timer (a page
// is only as long-lived as its shortest cached value), and on Vercel every
// refresh rewrites the page's cache files, which count towards the monthly
// ISR write limit. The server renders nothing here; the browser fills it in.

const subscribe = () => () => {};
// One stable value per page load (useSyncExternalStore needs the same value on every call).
const loadedAt = Date.now();
const now = () => loadedAt;
const never = () => null;

function useToday(): Date | null {
  const ms = useSyncExternalStore(subscribe, now, never);
  return ms === null ? null : new Date(ms);
}

/** "October 2026", in India time. */
export function MonthLabel() {
  const today = useToday();
  return <>{today ? monthYearLabel(today) : null}</>;
}

/** The year, in India time (for the footer copyright). */
export function CurrentYear() {
  const today = useToday();
  return <>{today ? Number(new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(today)) : null}</>;
}
