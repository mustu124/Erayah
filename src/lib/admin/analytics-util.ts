// Pure helpers shared by the analytics page (server) and its client components.

/** Change from prev to cur as a whole percentage; null when there's nothing to compare with. */
export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** 9812345210 → 98XXXXX210 */
export const maskPhone = (phone: string) => (phone.length >= 10 ? `${phone.slice(0, 2)}XXXXX${phone.slice(-3)}` : "XXXXXXXXXX");
