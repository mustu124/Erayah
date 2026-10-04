// Fills the database with about 150 fake orders over the last 90 days, for
// trying out /admin/analytics. Every row is marked is_test = true (orders and
// gift cards), analytics leaves them out unless "Include test orders" is on,
// and `pnpm clear:test-orders` removes them again.
//
//   pnpm seed:test-orders
//
// It does not touch stock, order numbers (these are TEST-…) or invoice
// numbers. The data is the same on every run (fixed random seed), so figures
// can be checked by hand.
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Deterministic random numbers (mulberry32).
let seed = 20261004;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

const PLACES: [state: string, city: string, pincode: string, weight: number][] = [
  ["Maharashtra", "Mumbai", "400001", 9], ["Maharashtra", "Pune", "411001", 5], ["Delhi", "New Delhi", "110001", 8],
  ["Karnataka", "Bengaluru", "560001", 7], ["Gujarat", "Ahmedabad", "380001", 5], ["Gujarat", "Surat", "395003", 3],
  ["Rajasthan", "Jaipur", "302001", 4], ["Tamil Nadu", "Chennai", "600001", 4], ["Telangana", "Hyderabad", "500001", 5],
  ["West Bengal", "Kolkata", "700001", 3], ["Uttar Pradesh", "Lucknow", "226001", 2], ["Punjab", "Ludhiana", "141001", 2],
  ["Kerala", "Kochi", "682001", 2], ["Madhya Pradesh", "Indore", "452001", 1],
];
const FIRST = ["Aanya", "Diya", "Ishita", "Kavya", "Meera", "Nisha", "Pooja", "Riya", "Sana", "Tara", "Anika", "Bhavna", "Charu", "Esha", "Farah", "Gauri", "Hema", "Jaya", "Lata", "Mira"];
const LAST = ["Shah", "Mehta", "Iyer", "Kapoor", "Reddy", "Nair", "Gupta", "Khan", "Desai", "Bose", "Jain", "Rao", "Sethi", "Verma", "Pillai"];

const TOTAL = 150;
const REFUNDED = 3;
const CANCELLED = 3;
const DAYS = 90;

async function main() {
  const existing = await db.from("orders").select("id", { count: "exact", head: true }).eq("is_test", true);
  if (existing.count) {
    console.error(`There are already ${existing.count} test orders. Run "pnpm clear:test-orders" first.`);
    process.exit(1);
  }

  const { data: products, error } = await db
    .from("products")
    .select("id, name, price, product_images(storage_path, role, sort_order)")
    .eq("is_published", true)
    .not("price", "is", null)
    .order("id");
  if (error || !products?.length) throw new Error(`no products to sell: ${error?.message ?? "none published"}`);
  // A few favourites sell more, like a real shop.
  const weighted = products.flatMap((p, i) => Array(i % 7 === 0 ? 6 : i % 3 === 0 ? 3 : 1).fill(p)) as typeof products;
  const imageOf = (p: (typeof products)[number]) =>
    [...p.product_images].filter((i) => i.role !== "video").sort((a, b) => (a.role === "worn_closeup" ? -1 : 0) - (b.role === "worn_closeup" ? -1 : 0) || a.sort_order - b.sort_order)[0]?.storage_path ?? null;

  // 95 customers; a dozen regulars place a quarter of the orders. Phones are written a few ways on purpose.
  const customers = Array.from({ length: 95 }, (_, i) => {
    const digits = `90000${String(10001 + i)}`;
    const style = i % 4;
    return {
      name: `${pick(FIRST)} ${pick(LAST)}`,
      phone: style === 0 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : style === 1 ? `91${digits}` : digits,
      place: (() => {
        const bag = PLACES.flatMap((p) => Array(p[3]).fill(p)) as typeof PLACES;
        return pick(bag);
      })(),
    };
  });
  const regulars = customers.slice(0, 12);

  // Four test gift cards, issued inside the range.
  const now = Date.now();
  const cards = [300000, 500000, 200000, 250000].map((value, i) => ({
    code: `TESTGC${i + 1}`,
    initial_balance: value,
    balance: value,
    is_test: true,
    note: "Seeded test gift card",
    created_at: new Date(now - (70 - i * 15) * 86_400_000).toISOString(),
  }));
  const { data: cardRows, error: cardError } = await db.from("gift_cards").insert(cards).select("id, code, balance, created_at");
  if (cardError) throw new Error(`gift cards: ${cardError.message}`);
  const balances = new Map(cardRows.map((c) => [c.id, c.balance]));

  const orders = [];
  const itemsFor: { product_id: number; name_snapshot: string; image_path_snapshot: string | null; unit_price: number; quantity: number; line_total: number }[][] = [];
  const redemptions: { index: number; gift_card_id: number; amount: number }[] = [];

  for (let n = 0; n < TOTAL; n++) {
    const customer = rand() < 0.25 ? pick(regulars) : pick(customers);
    const [state, city, pincode] = customer.place;
    // Paid between 9 am and 11 pm India time, some day in the last 90.
    const daysAgo = int(0, DAYS - 1);
    const istMinutes = int(9 * 60, 23 * 60 - 1);
    const midnightIst = new Date(now + 330 * 60_000);
    midnightIst.setUTCHours(0, 0, 0, 0);
    let paidAt = midnightIst.getTime() - 330 * 60_000 - daysAgo * 86_400_000 + istMinutes * 60_000;
    if (paidAt > now) paidAt = now - int(5, 120) * 60_000;

    const lines = Array.from({ length: rand() < 0.65 ? 1 : rand() < 0.8 ? 2 : 3 }, () => {
      const p = pick(weighted);
      const quantity = rand() < 0.88 ? 1 : 2;
      return { product_id: p.id, name_snapshot: p.name, image_path_snapshot: imageOf(p), unit_price: p.price!, quantity, line_total: p.price! * quantity };
    }).filter((line, i, all) => all.findIndex((l) => l.product_id === line.product_id) === i);
    const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
    const shipping = 10000;
    const gross = subtotal + shipping;

    // About one order in fifteen uses a gift card that existed by then.
    let giftCard: { id: number; code: string; amount: number } | null = null;
    if (rand() < 0.07) {
      const card = cardRows.find((c) => Date.parse(c.created_at) < paidAt && (balances.get(c.id) ?? 0) > 0);
      if (card) {
        const amount = Math.min(balances.get(card.id)!, pick([50000, 100000, 150000]), gross - 100);
        balances.set(card.id, balances.get(card.id)! - amount);
        giftCard = { id: card.id, code: card.code, amount };
      }
    }

    const kind = n < REFUNDED ? "refunded" : n < REFUNDED + CANCELLED ? "cancelled" : "sale";
    const status =
      kind === "refunded" ? "refunded"
      : kind === "cancelled" ? "cancelled"
      : daysAgo > 20 ? "delivered"
      : daysAgo > 10 ? pick(["delivered", "shipped"])
      : daysAgo > 3 ? pick(["shipped", "packed", "confirmed"])
      : pick(["confirmed", "placed"]);

    orders.push({
      order_number: `TEST-2026-${String(n + 1).padStart(5, "0")}`,
      status,
      payment_method: "razorpay" as const,
      payment_status: kind === "refunded" ? ("refunded" as const) : ("paid" as const),
      customer_name: customer.name,
      email: `test${n + 1}@erayah.test`,
      phone: customer.phone,
      address_line1: `${int(1, 240)} Test Street`,
      city,
      state,
      pincode,
      subtotal,
      shipping_fee: shipping,
      gst_amount: Math.round((gross * 3) / 103),
      gift_card_code: giftCard?.code ?? null,
      gift_card_amount: giftCard?.amount ?? 0,
      total: gross - (giftCard?.amount ?? 0),
      razorpay_payment_id: `pay_test${String(n + 1).padStart(6, "0")}`,
      paid_at: new Date(paidAt).toISOString(),
      created_at: new Date(paidAt - int(2, 9) * 60_000).toISOString(),
      is_test: true,
      internal_notes: "Seeded test order",
      stock_released_at: kind === "sale" ? null : new Date(paidAt + 3_600_000).toISOString(),
    });
    itemsFor.push(lines);
    if (giftCard) redemptions.push({ index: n, gift_card_id: giftCard.id, amount: giftCard.amount });
  }

  const ids: string[] = [];
  for (let i = 0; i < orders.length; i += 50) {
    const { data, error: e } = await db.from("orders").insert(orders.slice(i, i + 50)).select("id, order_number");
    if (e) throw new Error(`orders: ${e.message}`);
    const byNumber = new Map(data.map((o) => [o.order_number, o.id]));
    for (const o of orders.slice(i, i + 50)) ids.push(byNumber.get(o.order_number)!);
  }
  const items = itemsFor.flatMap((lines, i) => lines.map((line) => ({ ...line, order_id: ids[i] })));
  for (let i = 0; i < items.length; i += 200) {
    const { error: e } = await db.from("order_items").insert(items.slice(i, i + 200));
    if (e) throw new Error(`order items: ${e.message}`);
  }
  if (redemptions.length) {
    const { error: e } = await db.from("gift_card_redemptions").insert(redemptions.map((r) => ({ gift_card_id: r.gift_card_id, order_id: ids[r.index], amount: r.amount })));
    if (e) throw new Error(`redemptions: ${e.message}`);
    for (const [id, balance] of balances) await db.from("gift_cards").update({ balance }).eq("id", id);
  }

  const sales = orders.filter((o) => o.payment_status === "paid" && o.status !== "cancelled");
  console.log(`\n✓ ${orders.length} test orders (${sales.length} sales, ${REFUNDED} refunded, ${CANCELLED} cancelled), ${items.length} lines, ${cards.length} gift cards, ${redemptions.length} gift card uses.`);
  console.log(`  Sales total ₹${(sales.reduce((n, o) => n + o.total, 0) / 100).toLocaleString("en-IN")} over the last ${DAYS} days.`);
  console.log(`  See them at /admin/analytics with "Include test orders" (development only). Remove with: pnpm clear:test-orders\n`);
}

main().catch((e) => {
  console.error("Seeding failed:", e.message ?? e);
  process.exit(1);
});
