import { createDb } from "./harness.mjs";

// Checkout functions (create_order, confirm_payment, expiry) against every
// migration, in an in-memory Postgres (PGlite) with Supabase's schemas stubbed.
// Run: pnpm test:db

const { db, files, apply } = await createDb();
// The checkout migration must be safe to run again.
const checkoutMigration = files.find((f) => f.endsWith("_checkout.sql"));
await apply(checkoutMigration);
console.log(`✓ ${checkoutMigration} re-ran cleanly`);

let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? "✓" : "✗"} ${m}`);
  if (!c) fails++;
};
const one = async (s, p) => (await db.query(s, p)).rows[0];
const err = async (s, p, code, m) => {
  try {
    await db.query(s, p);
    ok(false, m + " (no error)");
  } catch (e) {
    ok(e.message.includes(code), `${m} → ${e.message.split("\n")[0]}`);
  }
};

await db.exec(`
  insert into products (slug,name,category_id,price,stock_qty,is_published) values
   ('meher','Meher Earrings',1,850000,3,true), ('bindu','Bindu Ring',3,75000,1,true);
  insert into gift_cards (code, initial_balance, balance) values ('GIFT500', 50000, 50000);
  insert into gift_cards (code, initial_balance, balance, expires_at) values ('OLDCARD', 50000, 50000, now() - interval '1 day');
`);

const jobs = (await db.query("select schedule, command from cron.job where jobname='expire-pending-orders'")).rows;
ok(jobs.length === 1, `exactly one expiry job (found ${jobs.length})`);
ok(jobs[0].schedule === "*/30 * * * *" && jobs[0].command.includes("60 minutes"), "expiry job: every 30 min, 60-minute window");
const idx = await one("select count(*)::int n from pg_indexes where indexname = 'orders_idempotency_key_idx'");
ok(idx.n === 1, "idempotency index exists once");
ok(
  (await one("select column_default d from information_schema.columns where table_name='orders' and column_name='payment_method'")).d.includes("razorpay"),
  "payment_method defaults to razorpay",
);

const cust = { name: "Asha Rao", email: "asha@example.com", phone: "9876543210" };
const addr = { line1: "12 Marine Drive", city: "Mumbai", state: "Maharashtra", pincode: "400001" };
const co = async (payload) => (await one("select create_order($1) r", [payload])).r;

// Dry run: priced, nothing written.
const q1 = await co({ dry_run: true, items: [{ product_id: 1, quantity: 2 }] });
ok(q1.subtotal === 1700000 && q1.shipping_fee === null && q1.order_id === null && q1.lines.length === 1, "dry run without pincode: subtotal, no shipping, no order");
const q2 = await co({ dry_run: true, items: [{ product_id: 1, quantity: 1 }], address: { pincode: "400001" }, gift_card_code: "gift500" });
ok(q2.shipping_fee === 10000 && q2.gift_card_amount === 50000 && q2.total === 810000 && q2.est_days_min === 7, `dry run with pincode + gift card: total ${q2.total}`);
ok(
  (await one("select stock_qty from products where id=1")).stock_qty === 3 && (await one("select balance from gift_cards where code='GIFT500'")).balance === 50000,
  "dry run reserved nothing",
);
ok((await one("select count(*)::int n from orders")).n === 0, "dry run created no order");
await err("select create_order($1)", [{ dry_run: true, items: [{ product_id: 1, quantity: 1 }], gift_card_code: "OLDCARD" }], "GIFT_CARD_INVALID", "expired gift card rejected in quote");
await err("select create_order($1)", [{ dry_run: true, items: [{ product_id: 2, quantity: 2 }] }], "OUT_OF_STOCK:2", "quote: out of stock");

// Real order with an idempotency key; the gift card covers part of it.
const o1 = await co({ idempotency_key: "k1", items: [{ product_id: 1, quantity: 1 }], customer: cust, address: addr, gift_card_code: "GIFT500" });
ok(o1.status === "pending_payment" && o1.payment_method === "razorpay" && o1.total === 810000 && o1.gift_card_amount === 50000, `order with partial gift card: total ${o1.total}`);
const again = await co({ idempotency_key: "k1", items: [{ product_id: 1, quantity: 1 }], customer: cust, address: addr, gift_card_code: "GIFT500" });
ok(again.existing === true && again.order_id === o1.order_id, "same idempotency key returns the same order");
ok((await one("select count(*)::int n from orders")).n === 1 && (await one("select stock_qty from products where id=1")).stock_qty === 2, "still one order, stock taken once");
await db.query("update orders set razorpay_order_id='order_A' where id=$1", [o1.order_id]);

// A failed attempt, then success: webhook first, then verify.
await db.query("select mark_payment_failed('order_A','pay_1','card declined')");
ok((await one("select payment_status, status from orders where id=$1", [o1.order_id])).payment_status === "failed", "failed attempt marks payment failed, order still pending");
await err("select confirm_payment('order_A','pay_2',null,999,'webhook')", [], "AMOUNT_MISMATCH", "wrong amount rejected");
const w = (await one("select confirm_payment('order_A','pay_2',null,810000,'webhook') r")).r;
ok(w.newly_placed === true && w.status === "placed", "webhook confirms first: newly placed");
const v = (await one("select confirm_payment('order_A','pay_2','sig',null,'verify') r")).r;
ok(v.newly_placed === false && v.status === "placed", "verify afterwards: no-op");
const ord = await one("select * from orders where id=$1", [o1.order_id]);
ok(ord.payment_status === "paid" && /^ERY\/\d\d-\d\d\/00001$/.test(ord.invoice_number), `invoice ${ord.invoice_number}`);
ok((await one("select count(*)::int n from order_events where order_id=$1 and type='payment' and to_value='placed'", [o1.order_id])).n === 1, "placed exactly once");

// Last item, two buyers: the second is refused.
const a = await co({ idempotency_key: "kA", items: [{ product_id: 2, quantity: 1 }], customer: cust, address: addr });
await err("select create_order($1)", [{ idempotency_key: "kB", items: [{ product_id: 2, quantity: 1 }], customer: cust, address: addr }], "OUT_OF_STOCK:2", "second buyer of the last ring refused");

// Expired order paid late: stock is back, so it's reserved again.
await db.query("update orders set razorpay_order_id='order_B', created_at = now() - interval '2 hours' where id=$1", [a.order_id]);
ok((await one("select expire_pending_orders(interval '60 minutes') n")).n === 1, "unpaid order expired after 60 minutes");
ok((await one("select stock_qty from products where id=2")).stock_qty === 1, "its stock released");
const late = (await one("select confirm_payment('order_B','pay_3',null,null,'webhook') r")).r;
ok(late.newly_placed && late.status === "placed" && (await one("select stock_qty from products where id=2")).stock_qty === 0, "late payment re-reserves stock and places the order");

// Expired, and the stock sold meanwhile: refund flagged.
const c = await co({ idempotency_key: "kC", items: [{ product_id: 1, quantity: 2 }], customer: cust, address: addr });
await db.query("update orders set razorpay_order_id='order_C', created_at = now() - interval '2 hours' where id=$1", [c.order_id]);
await db.query("select expire_pending_orders(interval '60 minutes')");
await db.query("update products set stock_qty = 0 where id = 1");
const lost = (await one("select confirm_payment('order_C','pay_4',null,null,'webhook') r")).r;
ok(lost.needs_refund === true && lost.status === "cancelled", "late payment with no stock: refund flagged");
ok((await one("select count(*)::int n from order_events where order_id=$1 and note like 'REFUND NEEDED%'", [c.order_id])).n === 1, "refund note recorded");

// A gift card covering everything: placed and paid, no Razorpay.
await db.exec("update products set stock_qty = 5 where id = 1; insert into gift_cards (code, initial_balance, balance) values ('BIGCARD', 5000000, 5000000);");
const g = await co({ idempotency_key: "kG", items: [{ product_id: 1, quantity: 1 }], customer: cust, address: addr, gift_card_code: "BIGCARD" });
ok(g.status === "placed" && g.payment_method === "gift_card" && g.total === 0, "gift card covering everything: placed, paid");

console.log(fails ? `\n${fails} FAILED` : "\nAll checkout checks passed");
process.exit(fails ? 1 : 0);
