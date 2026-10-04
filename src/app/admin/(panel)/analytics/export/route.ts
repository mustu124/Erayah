import type { NextRequest } from "next/server";

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
  parseRange,
  pctChange,
} from "@/lib/admin/analytics";
import { getAdmin } from "@/lib/admin/auth";
import { csvResponse, csvRupees as rs } from "@/lib/admin/csv";

const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
const pct = (cur: number, prev: number) => {
  const p = pctChange(cur, prev);
  return p === null ? "" : `${p}%`;
};

/**
 * GET /admin/analytics/export?section=…&range=… → that section as CSV, from
 * the same server functions as the page. The repeat-customers list has full
 * phone numbers, so only the owner may download it.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return new Response("Please sign in.", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const range = parseRange(params);
  const { from, to, prevFrom, prevTo, includeTest: test } = range;
  const name = (section: string) => `erayah-${section}-${from}_to_${to}.csv`;

  switch (params.section) {
    case "summary": {
      const [cur, prev] = await Promise.all([getSummary(from, to, test), getSummary(prevFrom, prevTo, test)]);
      return csvResponse(name("summary"), ["Metric", `${from} to ${to}`, `${prevFrom} to ${prevTo}`, "Change"], [
        ["Total revenue (Rs)", rs(cur.revenue), rs(prev.revenue), pct(cur.revenue, prev.revenue)],
        ["Orders", cur.orders, prev.orders, pct(cur.orders, prev.orders)],
        ["Average order value (Rs)", rs(cur.aov), rs(prev.aov), pct(cur.aov, prev.aov)],
        ["Refunds (Rs)", rs(cur.refunds), rs(prev.refunds), ""],
        ["Refunded orders", cur.refund_count, prev.refund_count, ""],
        ["Paid by gift card (Rs)", rs(cur.gift_card_paid), rs(prev.gift_card_paid), ""],
        ...Object.entries(cur.by_status).map(([status, n]) => [`Orders now ${status}`, n, prev.by_status[status] ?? 0, ""]),
      ]);
    }
    case "sales-over-time": {
      const points = await getSalesOverTime(range);
      const head = range.bucket === "day" ? "Date" : range.bucket === "week" ? "Week starting" : "Month starting";
      return csvResponse(name("sales-over-time"), [head, "Revenue (Rs)", "Orders"], points.map((p) => [p.bucket, rs(p.revenue), p.orders]));
    }
    case "categories": {
      const rows = await getCategories(range);
      return csvResponse(name("categories"), ["Category", "Revenue (Rs)", "Units sold", "Share", "Previous period revenue (Rs)", "Change"],
        rows.map((c) => [c.category, rs(c.revenue), c.units, `${c.share.toFixed(1)}%`, rs(c.prevRevenue), pct(c.revenue, c.prevRevenue)]));
    }
    case "products": {
      const families = (await getProductFamilies(range)).sort((a, b) => b.units - a.units || b.revenue - a.revenue);
      return csvResponse(name("best-sellers"), ["Rank", "Design", "Version", "Units sold", "Revenue (Rs)"],
        families.flatMap((f, i) => [[i + 1, f.family, "All", f.units, rs(f.revenue)], ...f.members.map((m) => ["", f.family, m.name, m.units, rs(m.revenue)])]));
    }
    case "low-stock": {
      const threshold = await getLowStockThreshold();
      const rows = await getLowStock(threshold, test);
      return csvResponse(`erayah-low-stock-${istDate.format(new Date())}.csv`, ["Product", "Option", "In stock", "Sold in last 30 days", "Runs out in about (days)"],
        rows.map((l) => [l.name, l.variantLabel ?? "", l.stock, l.sold30d, l.daysLeft === null ? "" : l.daysLeft]));
    }
    case "locations": {
      const rows = await getLocations(range, "city");
      return csvResponse(name("locations"), ["State", "City", "Revenue (Rs)", "Orders", "Share", "Previous period revenue (Rs)"],
        rows.map((l) => [l.state, l.city ?? "", rs(l.revenue), l.orders, `${l.share.toFixed(1)}%`, rs(l.prevRevenue)]));
    }
    case "gift-cards": {
      const [cur, prev] = await Promise.all([getGiftCards(from, to, test), getGiftCards(prevFrom, prevTo, test)]);
      return csvResponse(name("gift-cards"), ["Metric", `${from} to ${to}`, `${prevFrom} to ${prevTo}`], [
        ["Value issued (Rs)", rs(cur.issued), rs(prev.issued)],
        ["Cards issued", cur.issued_count, prev.issued_count],
        ["Value redeemed (Rs)", rs(cur.redeemed), rs(prev.redeemed)],
        ["Orders using a gift card", cur.redeemed_orders, prev.redeemed_orders],
        ["Unused balance right now (Rs)", rs(cur.unused), ""],
        ["Active cards right now", cur.active_cards, ""],
      ]);
    }
    case "repeat-customers": {
      if (admin.role !== "owner") return new Response("Only the owner can download customer details.", { status: 403 });
      const stats = await getRepeatCustomers(from, to, test, 1000);
      return csvResponse(name("repeat-customers"), ["Customer", "Phone", "Orders", "Total spent (Rs)", "Last order (India date)", "Latest order number"],
        stats.top.map((c) => [c.name, c.phone, c.orders, rs(c.total_spent), istDate.format(new Date(c.last_order_at)), c.latest_order]));
    }
    default:
      return new Response("Unknown section.", { status: 400 });
  }
}
