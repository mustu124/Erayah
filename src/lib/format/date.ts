const TIME_ZONE = "Asia/Kolkata";

/** "October 2026" — the date-style label on section headers. */
export function monthYearLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: TIME_ZONE }).format(date);
}

// The current month and year are shown with <MonthLabel /> and <CurrentYear />
// (components/ui/Today.tsx), worked out in the browser: computing them on the
// server gave every page an hourly refresh, which used up Vercel's ISR writes.
