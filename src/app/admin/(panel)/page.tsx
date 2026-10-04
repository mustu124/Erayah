import type { Metadata } from "next";
import Link from "next/link";

import { OrdersTable } from "@/components/admin/OrdersTable";
import { PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { addDays, getLowStock, getLowStockThreshold, getSummary, istToday } from "@/lib/admin/analytics";
import { requireAdminPage } from "@/lib/admin/auth";
import { ORDER_LIST_SELECT, type OrderListRow, type OrderStatus } from "@/lib/admin/orders";
import { istDayStart, istWeekStart } from "@/lib/admin/time";
import { formatPrice } from "@/lib/format/price";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Dashboard" };

async function loadDashboard() {
  const LOW_STOCK = await getLowStockThreshold();
  const db = createAdminClient();
  const today = istDayStart();
  const week = istWeekStart();
  const paid: OrderStatus[] = ["placed", "confirmed", "packed", "shipped", "delivered"];

  const [todayOrders, weekOrders, waiting, products, latest, misses] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).in("status", paid).gte("created_at", today),
    db.from("orders").select("total, gift_card_amount").in("status", paid).gte("created_at", week),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "placed"),
    db.from("products").select("id, name, slug, stock_qty, product_variants(stock_qty)").eq("is_published", true),
    db.from("orders").select(ORDER_LIST_SELECT).neq("status", "pending_payment").order("created_at", { ascending: false }).limit(10),
    db.from("search_misses").select("term, count, last_seen").order("count", { ascending: false }).order("last_seen", { ascending: false }).limit(12),
  ]);

  const stockOf = (p: { stock_qty: number; product_variants: { stock_qty: number }[] }) =>
    p.product_variants.length ? p.product_variants.reduce((n, v) => n + v.stock_qty, 0) : p.stock_qty;
  const published = products.data ?? [];
  const low = published.filter((p) => stockOf(p) > 0 && stockOf(p) <= LOW_STOCK).map((p) => ({ ...p, stock: stockOf(p) }));
  const out = published.filter((p) => stockOf(p) === 0);

  return {
    todayCount: todayOrders.count ?? 0,
    weekRevenue: (weekOrders.data ?? []).reduce((n, o) => n + o.total + o.gift_card_amount, 0),
    waiting: waiting.count ?? 0,
    low,
    threshold: LOW_STOCK,
    outCount: out.length,
    latest: (latest.data ?? []) as unknown as OrderListRow[],
    misses: misses.data ?? [],
  };
}

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const [admin, query] = await Promise.all([requireAdminPage(), searchParams]);
  const today = istToday();
  const [d, last30, lowNow] = await Promise.all([
    loadDashboard(),
    getSummary(addDays(today, -29), today, false),
    getLowStockThreshold().then((t) => getLowStock(t, false)),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" description={`Signed in as ${admin.email}.`} />
      {query.denied ? (
        <p role="alert" className="mb-6 border border-plum/30 bg-paper px-4 py-3 text-body-sm text-plum">
          That page is for the owner only.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Today's orders" value={d.todayCount} href="/admin/orders?range=today" />
        <StatCard label="Revenue this week" value={formatPrice(d.weekRevenue)} hint="Paid orders since Monday" />
        <StatCard label="To confirm" value={d.waiting} tone={d.waiting ? "alert" : "plain"} href="/admin/orders?status=placed" hint="New paid orders" />
        <StatCard label="Low stock" value={d.low.length} hint={`${d.threshold} or fewer left`} href="/admin/products?stock=low" />
        <StatCard label="Out of stock" value={d.outCount} tone={d.outCount ? "alert" : "plain"} href="/admin/products?stock=out" />
      </div>

      <Link
        href="/admin/analytics"
        aria-label="Last 30 days: open Analytics"
        className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border border-mist bg-paper px-4 py-3 transition-colors duration-300 hover:border-ink/40 sm:grid-cols-[auto_repeat(4,minmax(0,1fr))_auto] sm:items-center sm:px-5"
      >
        <span className="col-span-2 text-label font-medium text-ink/65 uppercase sm:col-span-1">Last 30 days</span>
        {[
          ["Revenue", formatPrice(last30.revenue)],
          ["Orders", String(last30.orders)],
          ["Average order", formatPrice(last30.aov)],
          ["Low stock", `${lowNow.length} ${lowNow.length === 1 ? "piece" : "pieces"}`],
        ].map(([label, value]) => (
          <span key={label}>
            <span className="block text-caption text-ink/60">{label}</span>
            <span className="text-body font-medium tabular-nums">{value}</span>
          </span>
        ))}
        <span className="col-span-2 text-body-sm underline decoration-ink/30 underline-offset-4 sm:col-span-1">Analytics →</span>
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Latest orders" actions={<Link href="/admin/orders" className="text-body-sm underline decoration-ink/30 underline-offset-4">All orders</Link>}>
          <OrdersTable orders={d.latest} compact />
        </Panel>
        <div className="space-y-6">
          <Panel title="Running low">
            {d.low.length ? (
              <ul className="divide-y divide-mist">
                {d.low.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                    <Link href={`/admin/products/${p.id}`} className="truncate hover:underline">
                      {p.name}
                    </Link>
                    <span className="shrink-0 text-plum tabular-nums">{p.stock} left</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-ink/60">Nothing is running low.</p>
            )}
          </Panel>
          <Panel title="Searches with no results">
            {d.misses.length ? (
              <ul className="divide-y divide-mist">
                {d.misses.map((m) => (
                  <li key={m.term} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                    <span className="truncate">“{m.term}”</span>
                    <span className="shrink-0 text-ink/60 tabular-nums">{m.count}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-ink/60">No missed searches yet.</p>
            )}
            <p className="mt-3 text-caption text-ink/55">What shoppers looked for and didn&apos;t find. Useful for names, synonyms and new pieces.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
