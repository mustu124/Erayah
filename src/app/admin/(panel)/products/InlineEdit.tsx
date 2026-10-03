"use client";

import { useState } from "react";

import { useAdminAction } from "@/components/admin/use-action";
import { quickUpdateProduct } from "@/lib/admin/actions/products";
import { cn } from "@/lib/cn";

/** A number cell that saves on Enter or when you leave it. */
export function InlineNumber({ id, field, value, label, prefix }: { id: number; field: "price" | "stockQty"; value: number | null; label: string; prefix?: string }) {
  const initial = value === null ? "" : field === "price" ? String(value / 100) : String(value);
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const { run, pending } = useAdminAction(quickUpdateProduct);

  const commit = async () => {
    const clean = v.replace(/[₹,\s]/g, "");
    if (clean === saved || clean === "") return setV(saved);
    const r = await run({ id, [field]: clean } as never);
    if (r.ok) setSaved(clean);
    else setV(saved);
  };

  return (
    <div className="inline-flex items-center justify-end">
      {prefix ? <span className="text-body-sm text-ink/50">{prefix}</span> : null}
      <input
        aria-label={label}
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setV(saved);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "h-9 rounded-xs border border-transparent bg-transparent text-right text-body-sm tabular-nums hover:border-mist focus:border-ink focus:bg-paper",
          prefix ? "w-20 px-1.5" : "w-16 px-2",
          pending && "opacity-50",
        )}
      />
    </div>
  );
}
