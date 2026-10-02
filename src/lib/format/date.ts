import { cacheLife } from "next/cache";

const TIME_ZONE = "Asia/Kolkata";

/** "October 2026" — the date-style label on section headers. */
export function monthYearLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: TIME_ZONE }).format(date);
}

/** The current month label, shared across requests and refreshed hourly. */
export async function currentMonthLabel(): Promise<string> {
  "use cache";
  cacheLife("hours");
  return monthYearLabel(new Date());
}

/** The current year in India, for the footer copyright. */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return Number(new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: TIME_ZONE }).format(new Date()));
}
