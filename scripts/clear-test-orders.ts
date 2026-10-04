// Removes everything `pnpm seed:test-orders` created: orders marked
// is_test = true (their items, events and gift card uses go with them) and
// the TESTGC… gift cards. Real orders are never touched.
//
//   pnpm clear:test-orders
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const orders = await db.from("orders").delete().eq("is_test", true).select("id");
  if (orders.error) throw new Error(`orders: ${orders.error.message}`);
  const cards = await db.from("gift_cards").delete().eq("is_test", true).like("code", "TESTGC%").select("id");
  if (cards.error) throw new Error(`gift cards: ${cards.error.message}`);
  const left = await db.from("orders").select("id", { count: "exact", head: true }).eq("is_test", true);
  console.log(`\n✓ Removed ${orders.data.length} test orders and ${cards.data.length} test gift cards. Test orders left: ${left.count ?? 0}.\n`);
}

main().catch((e) => {
  console.error("Clearing failed:", e.message ?? e);
  process.exit(1);
});
