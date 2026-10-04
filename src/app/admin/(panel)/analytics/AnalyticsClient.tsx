"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState } from "react";

import { useAdminAction } from "@/components/admin/use-action";
import { TableWrap, td, th } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { saveLowStockThreshold } from "@/lib/admin/actions/analytics";
import type { LocationRow, ProductFamily } from "@/lib/admin/analytics";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format/price";

import { Bar, Delta } from "./parts";

const toggle = (on: boolean) => cn("inline-flex min-h-9 items-center rounded-full border px-3 text-caption", on ? "border-ink bg-ink text-ivory" : "border-mist bg-paper text-ink hover:border-ink/40");

/** Top 20 designs by units or revenue. A design sold in several colours or options expands to show each. */
export function ProductsTable({ families }: { families: ProductFamily[] }) {
  const [sort, setSort] = useState<"units" | "revenue">("units");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const rows = [...families].sort((a, b) => b[sort] - a[sort] || b.revenue - a.revenue).slice(0, 20);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2" role="group" aria-label="Sort best sellers">
        <span className="text-caption text-ink/65">Sort by</span>
        <button type="button" aria-pressed={sort === "units"} onClick={() => setSort("units")} className={toggle(sort === "units")}>
          Units sold
        </button>
        <button type="button" aria-pressed={sort === "revenue"} onClick={() => setSort("revenue")} className={toggle(sort === "revenue")}>
          Revenue
        </button>
      </div>
      <TableWrap>
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className={th}>#</th>
              <th className={th}>Product</th>
              <th className={`${th} text-right`}>Units</th>
              <th className={`${th} text-right`}>vs before</th>
              <th className={`${th} text-right`}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => {
              const expanded = open.has(f.family);
              return (
                <Fragment key={f.family}>
                  <tr>
                    <td className={`${td} w-8 text-ink/55 tabular-nums`}>{i + 1}</td>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0 overflow-hidden bg-ivory">{f.thumb ? <Image src={f.thumb} alt="" fill sizes="44px" className="object-cover" /> : null}</div>
                        <div className="min-w-0">
                          {f.productId ? (
                            <Link href={`/admin/products/${f.productId}`} className="font-medium hover:underline">
                              {f.family}
                            </Link>
                          ) : (
                            <span className="font-medium">{f.family}</span>
                          )}
                          {f.members.length ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() => setOpen((s) => {
                                const next = new Set(s);
                                if (next.has(f.family)) next.delete(f.family);
                                else next.add(f.family);
                                return next;
                              })}
                              className="block min-h-7 text-caption text-ink/65 underline decoration-ink/30 underline-offset-4"
                            >
                              {expanded ? "Hide" : "Show"} {f.members.length} versions
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{f.units}</td>
                    <td className={`${td} text-right`}>
                      <Delta cur={f.units} prev={f.prevUnits} />
                    </td>
                    <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPrice(f.revenue)}</td>
                  </tr>
                  {expanded
                    ? f.members.map((m) => (
                        <tr key={m.name} className="bg-paper-warm">
                          <td className={td} />
                          <td className={`${td} pl-16 text-ink/80`}>{m.name}</td>
                          <td className={`${td} text-right tabular-nums text-ink/80`}>{m.units}</td>
                          <td className={td} />
                          <td className={`${td} text-right whitespace-nowrap tabular-nums text-ink/80`}>{formatPrice(m.revenue)}</td>
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

/** Revenue by state, or by city, with bars for the top 10. */
export function LocationSection({ states, cities }: { states: LocationRow[]; cities: LocationRow[] }) {
  const [showCities, setShowCities] = useState(false);
  const rows = showCities ? cities : states;
  const name = (l: LocationRow) => (l.city ? `${l.city}, ${l.state}` : l.state);
  const top = rows.slice(0, 10);
  const max = Math.max(...top.map((l) => l.revenue), 1);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2" role="group" aria-label="Location detail">
        <button type="button" aria-pressed={!showCities} onClick={() => setShowCities(false)} className={toggle(!showCities)}>
          States
        </button>
        <button type="button" aria-pressed={showCities} onClick={() => setShowCities(true)} className={toggle(showCities)}>
          Show cities
        </button>
      </div>

      <ul className="space-y-2.5" aria-label={`Top ${top.length} ${showCities ? "cities" : "states"} by revenue`}>
        {top.map((l) => (
          <li key={name(l)} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-body-sm sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]">
            <span className="truncate">{name(l)}</span>
            <Bar value={(l.revenue / max) * 100} label={`${name(l)}: ${formatPrice(l.revenue)}`} />
            <span className="tabular-nums">{formatPrice(l.revenue)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <TableWrap>
          <table className="w-full min-w-[460px] border-collapse">
            <thead>
              <tr>
                <th className={th}>{showCities ? "City" : "State"}</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>vs before</th>
                <th className={`${th} text-right`}>Orders</th>
                <th className={`${th} text-right`}>Share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={name(l)}>
                  <td className={td}>{name(l)}</td>
                  <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPrice(l.revenue)}</td>
                  <td className={`${td} text-right`}>
                    <Delta cur={l.revenue} prev={l.prevRevenue} />
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{l.orders}</td>
                  <td className={`${td} text-right tabular-nums`}>{l.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </div>
    </div>
  );
}

/** "Low stock means N or fewer", saved in site settings. */
export function ThresholdForm({ threshold }: { threshold: number }) {
  const [value, setValue] = useState(String(threshold));
  const save = useAdminAction(saveLowStockThreshold);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.run({ threshold: value as unknown as number });
      }}
      className="flex flex-wrap items-center gap-2 text-body-sm"
    >
      <label htmlFor="low-stock-threshold">Alert when stock is at or below</label>
      <input
        id="low-stock-threshold"
        type="number"
        min={0}
        max={1000}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-20 rounded-xs border border-mist bg-paper px-2 text-body-sm tabular-nums focus:border-ink"
      />
      <Button type="submit" variant="outline" className="min-h-9 px-4" disabled={save.pending || value === String(threshold)}>
        {save.pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
