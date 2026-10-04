import { checker, createDb } from "./harness.mjs";

// The analytics functions against a handful of known orders, so every figure
// can be stated by hand. Run: pnpm test:db

const { db, files, apply } = await createDb();
const { ok, done } = checker("analytics");
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const all = async (sql, params) => (await db.query(sql, params)).rows;

// The migration is idempotent.
await apply(files.find((f) => f.endsWith("_analytics.sql")));
ok(true, "analytics migration re-ran cleanly");

// Without a service-role or admin identity, every function refuses.
let refused = false;
try {
  await db.query("select public.analytics_summary('2026-09-01', '2026-09-30')");
} catch (e) {
  refused = /NOT_ADMIN/.test(e.message);
}
ok(refused, "refused without an admin or service-role identity");

await db.exec(`select set_config('request.jwt.claims', '{"role":"service_role"}', false);`);

await db.exec(`
  insert into products (slug, name, category_id, price, stock_qty, is_published) values
    ('meher', 'Meher Earrings', 1, 850000, 1, true),
    ('dori-green', 'Dori Ring – Green', 3, 120000, 5, true),
    ('dori-pink', 'Dori Ring – Pink', 3, 120000, 0, true),
    ('gaja', 'Gajā Pendant', 5, 180000, 2, true);
  insert into gift_cards (code, initial_balance, balance, created_at) values ('GIFT1000', 100000, 50000, '2026-09-10T06:00:00Z');
  insert into gift_cards (code, initial_balance, balance, created_at, is_test) values ('TESTGC1', 100000, 100000, '2026-09-10T06:00:00Z', true);
`);

// Orders: amounts in paise. Times are UTC; India is +5:30.
const order = async (o) => {
  const row = await one(
    `insert into orders (order_number, status, payment_method, payment_status, customer_name, email, phone, address_line1, city, state, pincode,
                         subtotal, shipping_fee, gift_card_amount, gst_amount, total, paid_at, created_at, is_test)
     values ($1, $2, 'razorpay', $3, $4, 'a@erayah.test', $5, '1 Road', $6, $7, '400001', $8, 10000, $9, 0, $10, $11, $11, $12) returning id`,
    [o.n, o.status, o.pay, o.name, o.phone, o.city, o.state, o.sub, o.gc ?? 0, o.sub + 10000 - (o.gc ?? 0), o.at, o.test ?? false],
  );
  for (const [pid, name, qty, price] of o.items) {
    await db.query(
      "insert into order_items (order_id, product_id, name_snapshot, unit_price, quantity, line_total) values ($1, $2, $3, $4, $5, $6)",
      [row.id, pid, name, price, qty, qty * price],
    );
  }
};
const MEHER = [1, "Meher Earrings", 1, 850000];
const GREEN = [2, "Dori Ring – Green", 1, 120000];
const PINK = [3, "Dori Ring – Pink", 2, 120000];
const GAJA = [4, "Gajā Pendant", 1, 180000];

// In September (IST): four sales, one refund, one cancelled, one test order.
await order({ n: "T-2026-00001", status: "delivered", pay: "paid", name: "Asha", phone: "9811100001", city: "Mumbai", state: "Maharashtra", sub: 850000, at: "2026-09-05T10:00:00Z", items: [MEHER] });
await order({ n: "T-2026-00002", status: "placed", pay: "paid", name: "Asha Rao", phone: "+91 98111 00001", city: "mumbai", state: "Maharashtra", sub: 360000, gc: 50000, at: "2026-09-12T10:00:00Z", items: [GREEN, PINK] });
await order({ n: "T-2026-00003", status: "shipped", pay: "paid", name: "Bela", phone: "9822200002", city: "Jaipur", state: "Rajasthan", sub: 180000, at: "2026-09-12T20:00:00Z", items: [GAJA] });
// 30 Sep 23:30 IST is still September; 1 Oct 00:30 IST is not.
await order({ n: "T-2026-00004", status: "confirmed", pay: "paid", name: "Chitra", phone: "9833300003", city: "Pune", state: "Maharashtra", sub: 120000, at: "2026-09-30T18:00:00Z", items: [GREEN] });
await order({ n: "T-2026-00005", status: "placed", pay: "paid", name: "Dev", phone: "9844400004", city: "Delhi", state: "Delhi", sub: 180000, at: "2026-09-30T19:00:00Z", items: [GAJA] });
await order({ n: "T-2026-00006", status: "refunded", pay: "refunded", name: "Esha", phone: "9855500005", city: "Delhi", state: "Delhi", sub: 850000, at: "2026-09-15T10:00:00Z", items: [MEHER] });
await order({ n: "T-2026-00007", status: "cancelled", pay: "paid", name: "Farah", phone: "9866600006", city: "Delhi", state: "Delhi", sub: 850000, at: "2026-09-16T10:00:00Z", items: [MEHER] });
await order({ n: "T-2026-00008", status: "placed", pay: "paid", name: "Test", phone: "9877700007", city: "Delhi", state: "Delhi", sub: 120000, at: "2026-09-17T10:00:00Z", items: [GREEN], test: true });
// Bela also ordered in August.
await order({ n: "T-2026-00009", status: "delivered", pay: "paid", name: "Bela", phone: "9822200002", city: "Jaipur", state: "Rajasthan", sub: 120000, at: "2026-08-20T10:00:00Z", items: [GREEN] });

const FROM = "2026-09-01";
const TO = "2026-09-30";

// 1–3. Revenue = 860000 + 320000 + 190000 + 130000 = 1500000 over 4 sales.
const s = (await one("select public.analytics_summary($1, $2) r", [FROM, TO])).r;
ok(s.revenue === 1500000, `revenue ₹15,000 (got ${s.revenue / 100})`);
ok(s.orders === 4, `4 sales (got ${s.orders})`);
ok(Number(s.aov) === 375000, `average order ₹3,750 (got ${s.aov / 100})`);
ok(s.refunds === 860000 && s.refund_count === 1, "one refund of ₹8,600 reported separately");
ok(s.gift_card_paid === 50000, "gift card value used: ₹500");
ok(s.by_status.delivered === 1 && s.by_status.placed === 1 && s.by_status.shipped === 1 && s.by_status.confirmed === 1 && !s.by_status.cancelled, "status breakdown excludes cancelled");
const withTest = (await one("select public.analytics_summary($1, $2, true) r", [FROM, TO])).r;
ok(withTest.orders === 5 && withTest.revenue === 1630000, "test orders count only when asked for");
const october = (await one("select public.analytics_summary('2026-10-01', '2026-10-31') r")).r;
ok(october.orders === 1 && october.revenue === 190000, "an order paid at 00:30 IST on 1 October belongs to October");

// 4. Over time.
const days = await all("select * from public.analytics_sales_over_time($1, $2, 'day')", [FROM, TO]);
const day = (d) => days.find((r) => r.bucket.toISOString().slice(0, 10) === d || String(r.bucket).includes(d));
ok(days.length === 30, `30 daily buckets, empty days included (got ${days.length})`);
const total = days.reduce((n, r) => n + Number(r.revenue), 0);
ok(total === 1500000, "daily revenue adds up to the total");
const sep13 = days.filter((r) => Number(r.orders) === 1 && Number(r.revenue) === 190000);
ok(sep13.length === 1, "an order paid at 01:30 IST lands on the next India day");
void day;
const months = await all("select * from public.analytics_sales_over_time('2026-08-01', '2026-09-30', 'month')");
ok(months.length === 2 && Number(months[0].revenue) === 130000 && Number(months[1].revenue) === 1500000, "monthly buckets");
const weeks = await all("select * from public.analytics_sales_over_time($1, $2, 'week')", [FROM, TO]);
ok(weeks.reduce((n, r) => n + Number(r.orders), 0) === 4, "weekly buckets keep every order");

// 5. Categories: Earrings 850000 (1), Rings 120000 + 240000 + 120000 = 480000 (4), Pendants 180000 (1).
const cats = Object.fromEntries((await all("select * from public.analytics_by_category($1, $2)", [FROM, TO])).map((c) => [c.category, c]));
ok(Number(cats.Earrings.revenue) === 850000 && cats.Earrings.units === 1, "Earrings ₹8,500, 1 unit");
ok(Number(cats.Rings.revenue) === 480000 && cats.Rings.units === 4, "Rings ₹4,800, 4 units");
ok(Number(cats.Pendants.revenue) === 180000 && cats.Pendants.units === 1, "Pendants ₹1,800, 1 unit");
ok(Number(cats.Bracelets.revenue) === 0 && Number(cats["Necklace Sets"].revenue) === 0, "categories without sales are listed with zero");

// 6. Products, with the Dori colours sharing a family.
const prods = await all("select * from public.analytics_product_sales($1, $2)", [FROM, TO]);
const dori = prods.filter((p) => p.family === "Dori Ring");
ok(dori.length === 2 && dori.reduce((n, p) => n + p.units, 0) === 4, "Dori Ring – Green and – Pink group as one family (4 units)");
ok(prods[0].units === 2 && prods[0].name === "Dori Ring – Green" || prods[0].name === "Dori Ring – Pink", "most units first");

// 7. Low stock at threshold 2: Pink (0), Meher (1), Gajā (2). Green (5) is fine.
// (Low stock looks at the real last 30 days: push every order a year back, then pay one Gajā order two days ago.)
await db.exec("update orders set paid_at = paid_at - interval '1 year'");
await db.exec("update orders set paid_at = now() - interval '2 days' where order_number = 'T-2026-00003'");
const low = await all("select * from public.analytics_low_stock(2)");
ok(low.length === 3 && low[0].name === "Dori Ring – Pink" && Number(low[0].days_left) === 0, "sold-out piece first");
const gaja = low.find((r) => r.name === "Gajā Pendant");
ok(gaja.sold_30d === 1 && Number(gaja.days_left) === 60, "2 in stock, 1 sold in 30 days → about 60 days left");
ok(low.find((r) => r.name === "Meher Earrings").days_left === null, "no recent sales → no estimate");
ok((await all("select * from public.analytics_low_stock(5)")).length === 4, "a higher threshold includes more pieces");
await db.exec("update orders set paid_at = '2025-09-12T20:00:00Z' where order_number = 'T-2026-00003'");
await db.exec("update orders set paid_at = paid_at + interval '1 year'");

// 8. Location.
const states = await all("select * from public.analytics_by_location($1, $2, 'state')", [FROM, TO]);
ok(states[0].state === "Maharashtra" && Number(states[0].revenue) === 1310000 && states[0].orders === 3, "Maharashtra ₹13,100 from 3 orders");
const cities = await all("select * from public.analytics_by_location($1, $2, 'city')", [FROM, TO]);
ok(cities.find((c) => c.city === "Mumbai").orders === 2, "“Mumbai” and “mumbai” are one city");

// 9. Gift cards.
const gc = (await one("select public.analytics_gift_cards($1, $2) r", [FROM, TO])).r;
ok(gc.issued === 100000 && gc.issued_count === 1, "₹1,000 issued (test card left out)");
ok(gc.redeemed === 50000 && gc.redeemed_orders === 1, "₹500 redeemed on one order");
ok(gc.unused === 50000, "₹500 unused balance");

// 10. Repeat customers: Asha (two orders in range, phone written two ways) and Bela (ordered in August).
const rc = (await one("select public.analytics_repeat_customers($1, $2) r", [FROM, TO])).r;
ok(rc.unique_customers === 3, `3 unique customers (got ${rc.unique_customers})`);
ok(rc.repeat_customers === 2 && Number(rc.repeat_rate) === 66.7, `2 repeat customers, 66.7% (got ${rc.repeat_customers}, ${rc.repeat_rate})`);
const asha = rc.top.find((t) => t.phone === "9811100001");
ok(asha && asha.orders === 2 && asha.total_spent === 1180000 && asha.name === "Asha Rao", "Asha: 2 orders, ₹11,800, name from the latest order");
const bela = rc.top.find((t) => t.phone === "9822200002");
ok(bela && bela.orders === 2 && bela.latest_order === "T-2026-00003", "Bela counts her August order");

// Access: only service_role may execute.
const acl = await all(
  `select p.proname, has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') authed, has_function_privilege('service_role', p.oid, 'execute') service
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'analytics\\_%'`,
);
ok(acl.length === 10 && acl.every((f) => !f.anon && !f.authed && f.service), "all 10 analytics functions: service_role only");

done();
