import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

import { istDateToIso, istDayStart } from "./time";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "placed", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned", "refunded", "pending_payment",
];
export const PAYMENT_STATUSES: PaymentStatus[] = ["paid", "pending", "failed", "refunded"];

/** Where an order can go next. The happy path may skip steps; cancelling is possible until it ships. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  placed: ["confirmed", "packed", "shipped", "cancelled"],
  confirmed: ["packed", "shipped", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: ["refunded"],
  returned: ["refunded"],
  refunded: [],
};

/** Statuses that put the pieces back in stock (restore_stock is safe to call twice). */
export const RESTOCK_ON: OrderStatus[] = ["cancelled", "returned", "refunded"];

export const ORDER_LIST_SELECT =
  "id, order_number, created_at, customer_name, phone, email, city, total, gift_card_amount, payment_status, status, items:order_items(quantity)";

export type OrderListRow = {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string;
  total: number;
  gift_card_amount: number;
  payment_status: PaymentStatus;
  status: OrderStatus;
  items: { quantity: number }[];
};

export type OrderFilters = {
  q: string;
  status: OrderStatus | "all" | "";
  payment: PaymentStatus | "";
  from: string;
  to: string;
  range: "today" | "";
  page: number;
};

export const PAGE_SIZE = 50;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseOrderFilters(params: Record<string, string | string[] | undefined>): OrderFilters {
  const status = one(params.status);
  const payment = one(params.payment);
  return {
    q: one(params.q).trim().slice(0, 80),
    status: (ORDER_STATUSES as string[]).includes(status) || status === "all" ? (status as OrderFilters["status"]) : "",
    payment: (PAYMENT_STATUSES as string[]).includes(payment) ? (payment as PaymentStatus) : "",
    from: one(params.from),
    to: one(params.to),
    range: one(params.range) === "today" ? "today" : "",
    page: Math.max(1, Math.min(1000, Number(one(params.page)) || 1)),
  };
}

/**
 * Orders matching the filters, newest first. Unpaid checkout attempts
 * ("Awaiting payment") are hidden unless asked for, since most are abandoned.
 */
export async function listOrders(f: OrderFilters, opts: { all?: boolean; select?: string } = {}) {
  let query = createAdminClient()
    .from("orders")
    .select(opts.select ?? ORDER_LIST_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  else if (f.status !== "all") query = query.neq("status", "pending_payment");
  if (f.payment) query = query.eq("payment_status", f.payment);
  const from = f.range === "today" ? istDayStart() : istDateToIso(f.from);
  const to = istDateToIso(f.to, true);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", to);
  if (f.q) {
    // PostgREST's or() syntax treats , ( ) as separators; keep only safe characters.
    const term = f.q.replace(/[^\p{L}\p{N}@.+\- ]/gu, "").trim();
    const digits = term.replace(/\D/g, "");
    if (term) {
      const ors = [`order_number.ilike.%${term}%`, `customer_name.ilike.%${term}%`, `email.ilike.%${term}%`];
      if (digits.length >= 3) ors.push(`phone.ilike.%${digits.slice(-10)}%`);
      query = query.or(ors.join(","));
    }
  }
  if (!opts.all) query = query.range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  else query = query.limit(5000);

  const { data, count, error } = await query;
  if (error) throw new Error(`list orders: ${error.message}`);
  return { orders: (data ?? []) as unknown as OrderListRow[], count: count ?? 0 };
}

export function filtersToQuery(f: Partial<OrderFilters>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v && !(k === "page" && v === 1)) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
