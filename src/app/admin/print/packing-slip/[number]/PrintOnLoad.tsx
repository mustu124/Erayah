"use client";

import { useEffect } from "react";

/** Opens the print dialog once the slip has rendered, plus a button to print again. */
export function PrintOnLoad() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="mt-6 text-center print:hidden">
      <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xs bg-ink px-6 text-[12px] font-medium tracking-[0.12em] text-ivory uppercase">
        Print
      </button>
    </p>
  );
}
