import Link from "next/link";

import type { OrderListRow } from "@/lib/admin/orders";
import { formatDateTime } from "@/lib/admin/time";
import { formatPrice } from "@/lib/format/price";

import { EmptyState, StatusPill, TableWrap, td, th } from "./ui";

const itemCount = (o: OrderListRow) => o.items.reduce((n, i) => n + i.quantity, 0);
const href = (o: OrderListRow) => `/admin/orders/${o.order_number}`;

/** Orders as a table on wider screens and as tappable cards on phones. */
export function OrdersTable({ orders, compact }: { orders: OrderListRow[]; compact?: boolean }) {
  if (!orders.length) return <EmptyState>No orders here yet.</EmptyState>;
  return (
    <>
      <ul className="divide-y divide-mist md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={href(o)} className="block py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{o.order_number}</span>
                <span className="tabular-nums">{formatPrice(o.total + o.gift_card_amount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-body-sm text-ink/70">
                <span className="truncate">
                  {o.customer_name} · {o.city}
                </span>
                <StatusPill status={o.status} />
              </div>
              <p className="mt-1 text-caption text-ink/55">
                {formatDateTime(o.created_at)} · {itemCount(o)} {itemCount(o) === 1 ? "piece" : "pieces"}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <TableWrap>
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Date</th>
              <th className={th}>Customer</th>
              {compact ? null : <th className={th}>Phone</th>}
              <th className={th}>City</th>
              <th className={`${th} text-right`}>Items</th>
              <th className={`${th} text-right`}>Total</th>
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-ivory/50">
                <td className={td}>
                  <Link href={href(o)} className="font-medium underline-offset-4 hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className={`${td} whitespace-nowrap text-ink/75`}>{formatDateTime(o.created_at)}</td>
                <td className={td}>{o.customer_name}</td>
                {compact ? null : <td className={`${td} whitespace-nowrap tabular-nums`}>{o.phone}</td>}
                <td className={td}>{o.city}</td>
                <td className={`${td} text-right tabular-nums`}>{itemCount(o)}</td>
                <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatPrice(o.total + o.gift_card_amount)}</td>
                <td className={td}>
                  <StatusPill status={o.payment_status} />
                </td>
                <td className={td}>
                  <StatusPill status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
