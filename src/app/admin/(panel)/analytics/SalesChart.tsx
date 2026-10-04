"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TimePoint } from "@/lib/admin/analytics";
import { formatPrice } from "@/lib/format/price";

// Revenue and orders are different scales, so they get a chart each (never
// two y-axes on one plot), stacked on a shared date axis. One tooltip, on
// the revenue chart, reads out both; the crosshair is synced across the two.

const INK = "#311829";
const GRID = "#e5e5e5";
const MUTED = "#6e5d68";

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

type Bucket = "day" | "week" | "month";
/** `rupees` is plotted (so the axis picks round rupee ticks); `revenue` stays in paise for display. */
type Row = TimePoint & { tick: string; title: string; rupees: number };

function label(bucket: Bucket, iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (bucket === "month") return { tick: monthFmt.format(d), title: monthFmt.format(d) };
  if (bucket === "week") return { tick: dayFmt.format(d), title: `Week of ${longFmt.format(d)}` };
  return { tick: dayFmt.format(d), title: longFmt.format(d) };
}

function Readout({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = active ? payload?.[0]?.payload : null;
  if (!row) return null;
  return (
    <div className="border border-mist bg-paper px-3 py-2 text-body-sm shadow-sm">
      <p className="text-caption text-ink/65">{row.title}</p>
      <p className="mt-1 font-medium text-ink tabular-nums">{formatPrice(row.revenue)}</p>
      <p className="text-ink/75 tabular-nums">
        {row.orders} {row.orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

const axisTick = { fontSize: 11, fill: MUTED };

function Plot({ data, dataKey, format, withReadout }: { data: Row[]; dataKey: "rupees" | "orders"; format: (v: number) => string; withReadout: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} syncId="sales-over-time" margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="tick" tickLine={false} axisLine={{ stroke: GRID }} tick={axisTick} minTickGap={28} interval="preserveStartEnd" />
        <YAxis tickFormatter={format} width={52} tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
        <Tooltip cursor={{ stroke: INK, strokeWidth: 1 }} content={withReadout ? <Readout /> : () => null} isAnimationActive={false} />
        <Line type="linear" dataKey={dataKey} stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={data.length <= 31 ? { r: 2, fill: INK, strokeWidth: 0 } : false} activeDot={{ r: 5, fill: INK, stroke: "#ffffff", strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SalesChart({ points, bucket }: { points: TimePoint[]; bucket: Bucket }) {
  const data: Row[] = points.map((p) => ({ ...p, rupees: p.revenue / 100, ...label(bucket, p.bucket) }));
  const per = bucket === "day" ? "day" : bucket === "week" ? "week" : "month";

  return (
    <div>
      <figure>
        <figcaption className="mb-1 text-caption text-ink/70">Revenue per {per}</figcaption>
        <div className="h-52" role="img" aria-label={`Line chart of revenue per ${per}. The table below has the same figures.`}>
          <Plot data={data} dataKey="rupees" format={(v) => `₹${compact.format(v)}`} withReadout />
        </div>
      </figure>
      <figure className="mt-5">
        <figcaption className="mb-1 text-caption text-ink/70">Orders per {per}</figcaption>
        <div className="h-32" role="img" aria-label={`Line chart of orders per ${per}.`}>
          <Plot data={data} dataKey="orders" format={(v) => String(v)} withReadout={false} />
        </div>
      </figure>

      <details className="mt-4">
        <summary className="min-h-9 cursor-pointer text-caption text-ink/70">Show as a table</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="text-left text-caption text-ink/65">
                <th className="border-b border-mist py-1.5 pr-3 font-medium">{bucket === "day" ? "Date" : bucket === "week" ? "Week starting" : "Month"}</th>
                <th className="border-b border-mist py-1.5 pr-3 text-right font-medium">Revenue</th>
                <th className="border-b border-mist py-1.5 text-right font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.bucket}>
                  <td className="border-b border-mist py-1.5 pr-3">{row.tick}</td>
                  <td className="border-b border-mist py-1.5 pr-3 text-right tabular-nums">{formatPrice(row.revenue)}</td>
                  <td className="border-b border-mist py-1.5 text-right tabular-nums">{row.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
