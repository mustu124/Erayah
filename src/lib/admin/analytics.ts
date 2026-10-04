import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/storage";

export { maskPhone, pctChange } from "./analytics-util";

// Admin analytics: date ranges in India time and one loader per section.
// All arithmetic happens in the analytics_* Postgres functions
// (supabase/migrations/20261004001600_analytics.sql); this file only chooses
// the dates, calls them and shapes the rows for the page and the CSVs.

const IST_OFFSET_MS = 330 * 60_000;
const DAY = 86_400_000;

const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const addDays = (date: string, days: number) => toDate(parse(date) + days * DAY);
export const istToday = (now = Date.now()) => toDate(now + IST_OFFSET_MS);

export const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
] as const;
export type RangeKey = (typeof RANGE_PRESETS)[number]["key"] | "custom";

export type AnalyticsRange = {
  key: RangeKey;
  label: string;
  /** India-time dates, both included. */
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
  bucket: "day" | "week" | "month";
  includeTest: boolean;
  /** Query string that reproduces this range (for links and CSV downloads). */
  query: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Test orders can be included only in development, or when the test runner asks for it. */
export const testOrdersAllowed = () => process.env.NODE_ENV === "development" || process.env.ANALYTICS_TEST_TOGGLE === "1";

export function parseRange(params: Record<string, string | string[] | undefined>, today = istToday()): AnalyticsRange {
  const requested = one(params.range);
  let key: RangeKey = (RANGE_PRESETS.find((p) => p.key === requested)?.key ?? (requested === "custom" ? "custom" : "30d")) as RangeKey;
  let from = today;
  let to = today;

  if (key === "custom") {
    const a = one(params.from);
    const b = one(params.to);
    if (DATE_RE.test(a) && DATE_RE.test(b) && !Number.isNaN(parse(a)) && !Number.isNaN(parse(b))) {
      [from, to] = a <= b ? [a, b] : [b, a];
      if (to > today) to = today;
      if (from > to) from = to;
      // At most three years, so a typo can't ask for centuries.
      if (parse(to) - parse(from) > 1096 * DAY) from = addDays(to, -1096);
    } else key = "30d";
  }
  if (key === "7d") from = addDays(today, -6);
  if (key === "30d") from = addDays(today, -29);
  if (key === "month") from = `${today.slice(0, 8)}01`;
  if (key === "last-month") {
    to = addDays(`${today.slice(0, 8)}01`, -1);
    from = `${to.slice(0, 8)}01`;
  }

  const days = Math.round((parse(to) - parse(from)) / DAY) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  const includeTest = testOrdersAllowed() && one(params.test) === "1";
  const q = new URLSearchParams({ range: key });
  if (key === "custom") {
    q.set("from", from);
    q.set("to", to);
  }
  if (includeTest) q.set("test", "1");

  return {
    key,
    label: key === "custom" ? "Custom" : RANGE_PRESETS.find((p) => p.key === key)!.label,
    from,
    to,
    prevFrom,
    prevTo,
    days,
    bucket: days <= 31 ? "day" : days <= 183 ? "week" : "month",
    includeTest,
    query: q.toString(),
  };
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

// ─── 1–3 ────────────────────────────────────────────────────────────────────

export type Summary = {
  revenue: number;
  orders: number;
  aov: number;
  gift_card_paid: number;
  refunds: number;
  refund_count: number;
  by_status: Record<string, number>;
};

export async function getSummary(from: string, to: string, includeTest: boolean): Promise<Summary> {
  const data = unwrap(await createAdminClient().rpc("analytics_summary", { p_from: from, p_to: to, p_include_test: includeTest }), "analytics_summary");
  const s = data as unknown as Summary;
  return { ...s, aov: Number(s.aov) };
}

// ─── 4 ──────────────────────────────────────────────────────────────────────

export type TimePoint = { bucket: string; revenue: number; orders: number };

export async function getSalesOverTime(r: AnalyticsRange): Promise<TimePoint[]> {
  const data = unwrap(
    await createAdminClient().rpc("analytics_sales_over_time", { p_from: r.from, p_to: r.to, p_bucket: r.bucket, p_include_test: r.includeTest }),
    "analytics_sales_over_time",
  );
  return data.map((d) => ({ bucket: d.bucket, revenue: Number(d.revenue), orders: d.orders }));
}

// ─── 5 ──────────────────────────────────────────────────────────────────────

export type CategoryRow = { category: string; revenue: number; units: number; share: number; prevRevenue: number };

export async function getCategories(r: AnalyticsRange): Promise<CategoryRow[]> {
  const db = createAdminClient();
  const [cur, prev] = await Promise.all([
    db.rpc("analytics_by_category", { p_from: r.from, p_to: r.to, p_include_test: r.includeTest }),
    db.rpc("analytics_by_category", { p_from: r.prevFrom, p_to: r.prevTo, p_include_test: r.includeTest }),
  ]);
  const rows = unwrap(cur, "analytics_by_category");
  const before = new Map(unwrap(prev, "analytics_by_category").map((c) => [c.category, Number(c.revenue)]));
  const total = rows.reduce((n, c) => n + Number(c.revenue), 0);
  return rows.map((c) => ({
    category: c.category,
    revenue: Number(c.revenue),
    units: c.units,
    share: total ? (Number(c.revenue) / total) * 100 : 0,
    prevRevenue: before.get(c.category) ?? 0,
  }));
}

// ─── 6 ──────────────────────────────────────────────────────────────────────

export type ProductFamily = {
  family: string;
  productId: number | null;
  thumb: string | null;
  units: number;
  revenue: number;
  prevUnits: number;
  /** Each colour or option sold, when there is more than one. */
  members: { name: string; units: number; revenue: number }[];
};

export async function getProductFamilies(r: AnalyticsRange): Promise<ProductFamily[]> {
  const db = createAdminClient();
  const [cur, prev] = await Promise.all([
    db.rpc("analytics_product_sales", { p_from: r.from, p_to: r.to, p_include_test: r.includeTest }),
    db.rpc("analytics_product_sales", { p_from: r.prevFrom, p_to: r.prevTo, p_include_test: r.includeTest }),
  ]);
  const before = new Map<string, number>();
  for (const p of unwrap(prev, "analytics_product_sales")) before.set(p.family, (before.get(p.family) ?? 0) + p.units);

  const families = new Map<string, ProductFamily>();
  for (const p of unwrap(cur, "analytics_product_sales")) {
    const f = families.get(p.family) ?? { family: p.family, productId: p.product_id, thumb: null, units: 0, revenue: 0, prevUnits: before.get(p.family) ?? 0, members: [] };
    f.units += p.units;
    f.revenue += Number(p.revenue);
    f.thumb ??= p.image_path ? publicStorageUrl("product-images", p.image_path) : null;
    f.members.push({ name: p.variant_label ? `${p.name} · ${p.variant_label}` : p.name, units: p.units, revenue: Number(p.revenue) });
    families.set(p.family, f);
  }
  return [...families.values()].map((f) => ({ ...f, productId: f.members.length === 1 ? f.productId : null, members: f.members.length > 1 ? f.members : [] }));
}

// ─── 7 ──────────────────────────────────────────────────────────────────────

export type LowStockRow = { productId: number; name: string; variantLabel: string | null; stock: number; sold30d: number; daysLeft: number | null };

export async function getLowStockThreshold(): Promise<number> {
  const { data } = await createAdminClient().from("site_settings").select("low_stock_threshold").eq("id", 1).maybeSingle();
  return data?.low_stock_threshold ?? 2;
}

export async function getLowStock(threshold: number, includeTest: boolean): Promise<LowStockRow[]> {
  const data = unwrap(await createAdminClient().rpc("analytics_low_stock", { p_threshold: threshold, p_include_test: includeTest }), "analytics_low_stock");
  return data.map((d) => ({ productId: d.product_id, name: d.name, variantLabel: d.variant_label, stock: d.stock, sold30d: d.sold_30d, daysLeft: d.days_left === null ? null : Number(d.days_left) }));
}

// ─── 8 ──────────────────────────────────────────────────────────────────────

export type LocationRow = { state: string; city: string | null; revenue: number; orders: number; share: number; prevRevenue: number };

export async function getLocations(r: AnalyticsRange, level: "state" | "city"): Promise<LocationRow[]> {
  const db = createAdminClient();
  const [cur, prev] = await Promise.all([
    db.rpc("analytics_by_location", { p_from: r.from, p_to: r.to, p_level: level, p_include_test: r.includeTest }),
    db.rpc("analytics_by_location", { p_from: r.prevFrom, p_to: r.prevTo, p_level: level, p_include_test: r.includeTest }),
  ]);
  const rows = unwrap(cur, "analytics_by_location");
  const key = (l: { state: string; city: string | null }) => `${l.state}|${l.city ?? ""}`;
  const before = new Map(unwrap(prev, "analytics_by_location").map((l) => [key(l), Number(l.revenue)]));
  const total = rows.reduce((n, l) => n + Number(l.revenue), 0);
  return rows.map((l) => ({
    state: l.state,
    city: l.city,
    revenue: Number(l.revenue),
    orders: l.orders,
    share: total ? (Number(l.revenue) / total) * 100 : 0,
    prevRevenue: before.get(key(l)) ?? 0,
  }));
}

// ─── 9 ──────────────────────────────────────────────────────────────────────

export type GiftCardStats = { issued: number; issued_count: number; redeemed: number; redeemed_orders: number; unused: number; active_cards: number };

export async function getGiftCards(from: string, to: string, includeTest: boolean): Promise<GiftCardStats> {
  return unwrap(await createAdminClient().rpc("analytics_gift_cards", { p_from: from, p_to: to, p_include_test: includeTest }), "analytics_gift_cards") as unknown as GiftCardStats;
}

// ─── 10 ─────────────────────────────────────────────────────────────────────

export type RepeatCustomer = { phone: string; name: string; orders: number; total_spent: number; last_order_at: string; latest_order: string };
export type RepeatStats = { unique_customers: number; repeat_customers: number; repeat_rate: number; top: RepeatCustomer[] };

/** Full phone numbers come back from here: mask them before rendering (maskPhone). */
export async function getRepeatCustomers(from: string, to: string, includeTest: boolean, limit = 20): Promise<RepeatStats> {
  const data = unwrap(
    await createAdminClient().rpc("analytics_repeat_customers", { p_from: from, p_to: to, p_limit: limit, p_include_test: includeTest }),
    "analytics_repeat_customers",
  ) as unknown as RepeatStats;
  return { ...data, repeat_rate: Number(data.repeat_rate) };
}
