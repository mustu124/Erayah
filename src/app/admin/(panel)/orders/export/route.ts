import type { NextRequest } from "next/server";

import { getAdmin } from "@/lib/admin/auth";
import { listOrders, parseOrderFilters } from "@/lib/admin/orders";

const SELECT =
  "order_number, created_at, status, payment_status, payment_method, customer_name, email, phone, address_line1, address_line2, landmark, city, state, pincode, is_gift, gift_note, subtotal, shipping_fee, gift_card_code, gift_card_amount, gst_amount, total, razorpay_payment_id, courier_name, tracking_number, items:order_items(name_snapshot, variant_label, quantity)";

type Row = Record<string, unknown> & { items: { name_snapshot: string; variant_label: string | null; quantity: number }[] };

const rupees = (paise: unknown) => (typeof paise === "number" ? (paise / 100).toFixed(2) : "");
const istTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** Spreadsheet-safe CSV cell: quoted, and never starting with a formula character. */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** GET /admin/orders/export?…same filters as the list… → orders.csv */
export async function GET(request: NextRequest) {
  if (!(await getAdmin())) return new Response("Please sign in.", { status: 401 });
  const filters = parseOrderFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { orders } = await listOrders(filters, { all: true, select: SELECT });

  const header = [
    "Order", "Date (IST)", "Status", "Payment", "Method", "Customer", "Email", "Phone", "Address", "City", "State", "Pincode",
    "Items", "Gift", "Gift note", "Subtotal", "Shipping", "Gift card", "Gift card amount", "GST incl.", "Total (order value)", "Paid online", "Razorpay payment", "Courier", "Tracking",
  ];
  const lines = (orders as unknown as Row[]).map((o) =>
    [
      o.order_number,
      istTime.format(new Date(String(o.created_at))),
      o.status,
      o.payment_status,
      o.payment_method,
      o.customer_name,
      o.email,
      o.phone,
      [o.address_line1, o.address_line2, o.landmark ? `Landmark: ${o.landmark}` : null].filter(Boolean).join(", "),
      o.city,
      o.state,
      o.pincode,
      o.items.map((i) => `${i.name_snapshot}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`).join("; "),
      o.is_gift ? "Yes" : "",
      o.gift_note,
      rupees(o.subtotal),
      rupees(o.shipping_fee),
      o.gift_card_code,
      rupees(o.gift_card_amount),
      rupees(o.gst_amount),
      rupees((o.total as number) + (o.gift_card_amount as number)),
      rupees(o.total),
      o.razorpay_payment_id,
      o.courier_name,
      o.tracking_number,
    ]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="erayah-orders-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
