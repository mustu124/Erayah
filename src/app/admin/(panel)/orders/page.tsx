import type { Metadata } from "next";
import Link from "next/link";

import { OrdersTable } from "@/components/admin/OrdersTable";
import { inputCls, PageHeader, Panel, STATUS_LABELS } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireAdminPage } from "@/lib/admin/auth";
import { filtersToQuery, listOrders, ORDER_STATUSES, PAGE_SIZE, parseOrderFilters, PAYMENT_STATUSES } from "@/lib/admin/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdminPage();
  const filters = parseOrderFilters(await searchParams);
  const { orders, count } = await listOrders(filters);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const query = filtersToQuery({ ...filters, page: 1 });

  return (
    <>
      <PageHeader
        title="Orders"
        description="New paid orders show as “New”. Unpaid checkout attempts are hidden unless you choose “Awaiting payment” or “All, including unpaid”."
        actions={
          <a href={`/admin/orders/export${query}`} className={buttonClasses("outline")} download>
            Export CSV
          </a>
        }
      />

      <form method="get" className="mb-4 grid gap-3 border border-mist bg-paper p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="q" className="mb-1 block text-caption text-ink/70">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Order number, name, phone or email" className={inputCls} />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-caption text-ink/70">
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status} className={inputCls}>
            <option value="">All paid orders</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
            <option value="all">All, including unpaid</option>
          </select>
        </div>
        <div>
          <label htmlFor="payment" className="mb-1 block text-caption text-ink/70">
            Payment
          </label>
          <select id="payment" name="payment" defaultValue={filters.payment} className={inputCls}>
            <option value="">Any</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-caption text-ink/70">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className={inputCls} />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-caption text-ink/70">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className={inputCls} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClasses("solid", "px-5")}>
            Apply
          </button>
          <Link href="/admin/orders" className={buttonClasses("link", "px-2")}>
            Clear
          </Link>
        </div>
      </form>

      <Panel title={`${count} ${count === 1 ? "order" : "orders"}${filters.range === "today" ? " today" : ""}`}>
        <OrdersTable orders={orders} />
        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-body-sm">
            {filters.page > 1 ? <Link href={`/admin/orders${filtersToQuery({ ...filters, page: filters.page - 1 })}`}>← Newer</Link> : <span />}
            <span className="text-ink/60">
              Page {filters.page} of {pages}
            </span>
            {filters.page < pages ? <Link href={`/admin/orders${filtersToQuery({ ...filters, page: filters.page + 1 })}`}>Older →</Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </>
  );
}
