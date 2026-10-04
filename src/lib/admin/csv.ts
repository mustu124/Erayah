// CSV for spreadsheet downloads from /admin.

/** Spreadsheet-safe cell: quoted, and never starting with a formula character. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  // A leading = + - @ can run as a formula; plain numbers and percentages are fine.
  if (/^[=+\-@\t\r]/.test(s) && !/^[-+]?\d+(\.\d+)?%?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Paise → "1234.50" (plain number, so spreadsheets can sum it). */
export const csvRupees = (paise: unknown) => (typeof paise === "number" ? (paise / 100).toFixed(2) : "");

/** A CSV download response (UTF-8 with BOM so Excel reads ₹ and accents correctly). */
export function csvResponse(filename: string, header: string[], rows: unknown[][]): Response {
  const body = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
