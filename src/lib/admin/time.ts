// Dates in the owner's time zone (Asia/Kolkata, UTC+5:30, no daylight saving).

const IST_OFFSET_MS = 330 * 60_000;

/** Midnight IST today (or `daysAgo` days earlier), as a UTC ISO string for queries. */
export function istDayStart(daysAgo = 0, now = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  ist.setUTCDate(ist.getUTCDate() - daysAgo);
  return new Date(ist.getTime() - IST_OFFSET_MS).toISOString();
}

/** Midnight IST on the most recent Monday. */
export function istWeekStart(now = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const sinceMonday = (ist.getUTCDay() + 6) % 7;
  return istDayStart(sinceMonday, now);
}

/** "YYYY-MM-DD" (a date input's value) → the UTC ISO instant of that IST midnight, optionally the next day. */
export function istDateToIso(date: string, endOfDay = false): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(utcMidnight)) return null;
  return new Date(utcMidnight - IST_OFFSET_MS + (endOfDay ? 86_400_000 : 0)).toISOString();
}

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const dateLong = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** "3 Oct, 2:15 pm" */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
/** "3 October 2026, 2:15 pm" */
export const formatDateTimeLong = (iso: string) => dateLong.format(new Date(iso));
