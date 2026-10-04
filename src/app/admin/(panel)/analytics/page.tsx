import type { Metadata } from "next";
import Link from "next/link";

import { STATUS_LABELS, TableWrap, td, th } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import {
  getCategories,
  getGiftCards,
  getLocations,
  getLowStock,
  getLowStockThreshold,
  getProductFamilies,
  getRepeatCustomers,
  getSalesOverTime,
  getSummary,
  maskPhone,
  parseRange,
  RANGE_PRESETS,
  testOrdersAllowed,
} from "@/lib/admin/analytics";
import { requireAdminPage } from "@/lib/admin/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format/price";

import { LocationSection, ProductsTable, ThresholdForm } from "./AnalyticsClient";
import { Bar, Delta, numberIN, Section } from "./parts";
import { SalesChart } from "./SalesChart";

export const metadata: Metadata = { title: "Analytics" };

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const istDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const day = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));
const STATUS_ORDER = ["placed", "confirmed", "packed", "shipped", "delivered", "returned"];

function Kpi({ id, label, value, cur, prev, children }: { id: string; label: string; value: string; cur: number; prev: number; children?: React.ReactNode }) {
  return (
    <div className="border border-mist bg-paper p-4 sm:p-5" data-testid={`kpi-${id}`}>
      <p className="text-label font-medium text-ink/65 uppercase">{label}</p>
      <p className="mt-2 font-body text-[28px] leading-none font-medium text-ink sm:text-[32px]">{value}</p>
      <p className="mt-2">
        <Delta cur={cur} prev={prev} /> <span className="text-caption text-ink/55">vs previous period</span>
      </p>
      {children}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const admin = await requireAdminPage();
  const range = parseRange(await searchParams);
  const { from, to, prevFrom, prevTo, includeTest: test } = range;
  const csv = (section: string) => `/admin/analytics/export?section=${section}&${range.query}`;

  const threshold = await getLowStockThreshold();
  const [summary, prev, points, categories, families, lowStock, states, cities, giftCards, prevGiftCards, repeat, prevRepeat] = await Promise.all([
    getSummary(from, to, test),
    getSummary(prevFrom, prevTo, test),
    getSalesOverTime(range),
    getCategories(range),
    getProductFamilies(range),
    getLowStock(threshold, test),
    getLocations(range, "state"),
    getLocations(range, "city"),
    getGiftCards(from, to, test),
    getGiftCards(prevFrom, prevTo, test),
    getRepeatCustomers(from, to, test),
    getRepeatCustomers(prevFrom, prevTo, test, 0),
  ]);
  const hasSales = summary.orders > 0;
  const maxCategory = Math.max(...categories.map((c) => c.revenue), 1);
  const statuses = STATUS_ORDER.filter((s) => summary.by_status[s]);

  return (
    <>
      <div className="mb-5">
        <h1 className="font-heading text-h1 text-ink">Analytics</h1>
        <p className="mt-1 text-body-sm text-ink/70">
          From your orders only: no visitor tracking. A sale is a paid order that wasn&apos;t cancelled, counted on the day it was paid (India time).
        </p>
      </div>

      {/* One row of filters, scoping everything below (except Low stock). */}
      <div className="mb-6 border border-mist bg-paper p-3 sm:p-4">
        <nav aria-label="Date range" className="flex flex-wrap items-center gap-2">
          {RANGE_PRESETS.map((p) => (
            <Link
              key={p.key}
              href={`/admin/analytics?range=${p.key}${test ? "&test=1" : ""}`}
              aria-current={range.key === p.key ? "true" : undefined}
              className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-body-sm", range.key === p.key ? "border-ink bg-ink text-ivory" : "border-mist hover:border-ink/40")}
            >
              {p.label}
            </Link>
          ))}
          <form method="get" className="flex flex-wrap items-end gap-2 sm:ml-2">
            <input type="hidden" name="range" value="custom" />
            {test ? <input type="hidden" name="test" value="1" /> : null}
            <div>
              <label htmlFor="range-from" className="block text-[11px] text-ink/60">
                From
              </label>
              <input id="range-from" name="from" type="date" defaultValue={from} max={to} className="h-11 rounded-xs border border-mist bg-paper px-2 text-body-sm" />
            </div>
            <div>
              <label htmlFor="range-to" className="block text-[11px] text-ink/60">
                To
              </label>
              <input id="range-to" name="to" type="date" defaultValue={to} className="h-11 rounded-xs border border-mist bg-paper px-2 text-body-sm" />
            </div>
            <button type="submit" className={buttonClasses(range.key === "custom" ? "solid" : "outline", "px-4")}>
              Custom
            </button>
          </form>
        </nav>
        <p className="mt-3 text-caption text-ink/65" data-testid="range-summary">
          {day(from)}
          {from === to ? "" : ` – ${day(to)}`} ({range.days} {range.days === 1 ? "day" : "days"}), compared with {day(prevFrom)}
          {prevFrom === prevTo ? "" : ` – ${day(prevTo)}`}.
          {testOrdersAllowed() ? (
            <>
              {" "}
              <Link href={`/admin/analytics?${new URLSearchParams({ range: range.key, ...(range.key === "custom" ? { from, to } : {}), ...(test ? {} : { test: "1" }) })}`} className="underline underline-offset-2">
                {test ? "Hide test orders" : "Include test orders"}
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {!hasSales ? (
        <div className="mb-6 border border-mist bg-paper px-4 py-14 text-center" data-testid="no-sales">
          <p className="font-heading text-h2 text-ink">No sales in this period yet</p>
          <p className="mt-2 text-body-sm text-ink/65">Try a longer date range. Low stock and gift card balances are shown below as they stand today.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1–3 */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi id="revenue" label="Total revenue" value={formatPrice(summary.revenue)} cur={summary.revenue} prev={prev.revenue}>
              <p className="mt-2 text-caption text-ink/60">
                {summary.refund_count ? `Refunds: ${formatPrice(summary.refunds)} (${summary.refund_count}), not counted above.` : "No refunds."}
                {summary.gift_card_paid ? ` Plus ${formatPrice(summary.gift_card_paid)} paid by gift card.` : ""}
              </p>
            </Kpi>
            <Kpi id="orders" label="Orders" value={numberIN.format(summary.orders)} cur={summary.orders} prev={prev.orders}>
              <p className="mt-2 text-caption text-ink/60">{statuses.map((s) => `${summary.by_status[s]} ${STATUS_LABELS[s].toLowerCase()}`).join(" · ")}</p>
            </Kpi>
            <Kpi id="aov" label="Average order value" value={formatPrice(summary.aov)} cur={summary.aov} prev={prev.aov} />
          </div>
          <p className="-mt-3 text-right">
            <a href={csv("summary")} download className="text-caption text-ink/70 underline decoration-ink/30 underline-offset-4" aria-label="Download summary as CSV">
              Download CSV
            </a>
          </p>

          {/* 4 */}
          <Section id="sales-over-time" title="Sales over time" csv={csv("sales-over-time")}>
            <SalesChart points={points} bucket={range.bucket} />
          </Section>

          {/* 5 */}
          <Section id="by-category" title="Sales by category" note="Price of the pieces sold, before shipping and gift cards." csv={csv("categories")}>
            <ul className="space-y-2.5" aria-label="Revenue by category">
              {categories.map((c) => (
                <li key={c.category} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 text-body-sm">
                  <span className="truncate">{c.category}</span>
                  <Bar value={(c.revenue / maxCategory) * 100} label={`${c.category}: ${formatPrice(c.revenue)}`} />
                  <span className="tabular-nums">{formatPrice(c.revenue)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <TableWrap>
                <table className="w-full min-w-[460px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Category</th>
                      <th className={`${th} text-right`}>Revenue</th>
                      <th className={`${th} text-right`}>vs before</th>
                      <th className={`${th} text-right`}>Units</th>
                      <th className={`${th} text-right`}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.category}>
                        <td className={td}>{c.category}</td>
                        <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPrice(c.revenue)}</td>
                        <td className={`${td} text-right`}>
                          <Delta cur={c.revenue} prev={c.prevRevenue} />
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{c.units}</td>
                        <td className={`${td} text-right tabular-nums`}>{c.share.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </Section>

          {/* 6 */}
          <Section id="best-sellers" title="Best-selling products" note="Top 20. Colours of one design are grouped together." csv={csv("products")}>
            <ProductsTable families={families} />
          </Section>
        </div>
      )}

      <div className={cn("space-y-6", hasSales && "mt-6")}>
        {/* 7 */}
        <Section
          id="low-stock"
          title="Low stock alerts"
          note="As of now, with sales from the last 30 days. Not affected by the date range."
          csv={csv("low-stock")}
        >
          <ThresholdForm threshold={threshold} />
          {lowStock.length ? (
            <div className="mt-4">
              <TableWrap>
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Product</th>
                      <th className={`${th} text-right`}>In stock</th>
                      <th className={`${th} text-right`}>Sold in 30 days</th>
                      <th className={`${th} text-right`}>Runs out in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((l) => (
                      <tr key={`${l.productId}:${l.variantLabel ?? ""}`}>
                        <td className={td}>
                          <Link href={`/admin/products/${l.productId}`} className="font-medium hover:underline">
                            {l.name}
                            {l.variantLabel ? ` · ${l.variantLabel}` : ""}
                          </Link>
                        </td>
                        <td className={cn(td, "text-right tabular-nums", l.stock === 0 && "font-medium text-plum")}>{l.stock === 0 ? "Sold out" : l.stock}</td>
                        <td className={`${td} text-right tabular-nums`}>{l.sold30d}</td>
                        <td className={`${td} text-right whitespace-nowrap tabular-nums`}>
                          {l.stock === 0 ? "Now" : l.daysLeft === null ? "—" : `about ${Math.max(1, Math.round(l.daysLeft))} ${Math.round(l.daysLeft) <= 1 ? "day" : "days"}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          ) : (
            <p className="mt-4 text-body-sm text-ink/60">Nothing is at or below {threshold} in stock.</p>
          )}
        </Section>

        {/* 8 */}
        {hasSales ? (
          <Section id="by-location" title="Sales by location" note="Where orders were delivered." csv={csv("locations")}>
            <LocationSection states={states} cities={cities} />
          </Section>
        ) : null}

        {/* 9 */}
        <Section id="gift-cards" title="Gift card usage" note="Erayah has no coupons or discount codes, so this covers gift cards only." csv={csv("gift-cards")}>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-caption text-ink/65">Issued in this period</dt>
              <dd className="mt-1 text-h3 font-medium tabular-nums">{formatPrice(giftCards.issued)}</dd>
              <dd className="text-caption text-ink/60">
                {giftCards.issued_count} {giftCards.issued_count === 1 ? "card" : "cards"} · <Delta cur={giftCards.issued} prev={prevGiftCards.issued} />
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink/65">Redeemed in this period</dt>
              <dd className="mt-1 text-h3 font-medium tabular-nums">{formatPrice(giftCards.redeemed)}</dd>
              <dd className="text-caption text-ink/60">
                on {giftCards.redeemed_orders} {giftCards.redeemed_orders === 1 ? "order" : "orders"} · <Delta cur={giftCards.redeemed} prev={prevGiftCards.redeemed} />
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink/65">Unused balance right now</dt>
              <dd className="mt-1 text-h3 font-medium tabular-nums">{formatPrice(giftCards.unused)}</dd>
              <dd className="text-caption text-ink/60">
                across {giftCards.active_cards} active {giftCards.active_cards === 1 ? "card" : "cards"}
              </dd>
            </div>
          </dl>
        </Section>

        {/* 10 */}
        {hasSales ? (
          <Section
            id="repeat-customers"
            title="Repeat customers"
            note="Customers are recognised by phone number. Numbers are partly hidden here."
            csv={admin.role === "owner" ? csv("repeat-customers") : null}
            actions={admin.role === "owner" ? null : <span className="text-caption text-ink/55">Only the owner can download this list.</span>}
          >
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-caption text-ink/65">Unique customers</dt>
                <dd className="mt-1 text-h3 font-medium tabular-nums">
                  {numberIN.format(repeat.unique_customers)} <Delta cur={repeat.unique_customers} prev={prevRepeat.unique_customers} className="ml-1" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-ink/65">Ordered before, or more than once</dt>
                <dd className="mt-1 text-h3 font-medium tabular-nums">
                  {numberIN.format(repeat.repeat_customers)} <Delta cur={repeat.repeat_customers} prev={prevRepeat.repeat_customers} className="ml-1" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-ink/65">Repeat rate</dt>
                <dd className="mt-1 text-h3 font-medium tabular-nums">
                  {repeat.repeat_rate}% <Delta cur={repeat.repeat_rate} prev={prevRepeat.repeat_rate} className="ml-1" />
                </dd>
              </div>
            </dl>
            {repeat.top.length ? (
              <div className="mt-6">
                <TableWrap>
                  <table className="w-full min-w-[560px] border-collapse">
                    <thead>
                      <tr>
                        <th className={th}>Customer</th>
                        <th className={th}>Phone</th>
                        <th className={`${th} text-right`}>Orders</th>
                        <th className={`${th} text-right`}>Total spent</th>
                        <th className={th}>Last order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeat.top.map((c) => (
                        <tr key={c.latest_order}>
                          <td className={td}>
                            <Link href={`/admin/orders?customer=${c.latest_order}`} className="font-medium hover:underline">
                              {c.name}
                            </Link>
                          </td>
                          <td className={`${td} tabular-nums`}>{maskPhone(c.phone)}</td>
                          <td className={`${td} text-right tabular-nums`}>{c.orders}</td>
                          <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPrice(c.total_spent)}</td>
                          <td className={`${td} whitespace-nowrap`}>{istDate.format(new Date(c.last_order_at))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            ) : (
              <p className="mt-4 text-body-sm text-ink/60">No repeat customers in this period.</p>
            )}
          </Section>
        ) : null}
      </div>
    </>
  );
}
