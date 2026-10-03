import type { Metadata } from "next";
import Link from "next/link";

import { CopyButton } from "@/components/admin/CopyButton";
import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/admin/time";
import { formatPrice } from "@/lib/format/price";
import { createAdminClient } from "@/lib/supabase/admin";

import { ActiveToggle, NewGiftCard } from "./GiftCardForms";

export const metadata: Metadata = { title: "Gift cards" };

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Read at request time; admin pages are rendered per request. */
function isPast(iso: string | null) {
  return iso !== null && new Date(iso).getTime() <= new Date().getTime();
}

export default async function PromotionsPage() {
  await requireAdminPage("owner");
  const { data: cards } = await createAdminClient()
    .from("gift_cards")
    .select("id, code, initial_balance, balance, expires_at, is_active, note, created_at, gift_card_redemptions(id, amount, reversed_at, created_at, orders(order_number))")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Gift cards"
        description="A gift card works like a payment at checkout: its balance comes off the total, and whatever is left stays on the card. There are no coupons or discount codes."
      />
      <Panel title="New gift card" className="mb-6">
        <NewGiftCard />
      </Panel>

      <Panel title={`${cards?.length ?? 0} gift cards`}>
        {!cards?.length ? (
          <EmptyState>No gift cards yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-mist">
            {cards.map((c) => {
              const expired = isPast(c.expires_at);
              const status = !c.is_active ? "Deactivated" : expired ? "Expired" : c.balance === 0 ? "Used up" : "Active";
              const uses = c.gift_card_redemptions.filter((r) => !r.reversed_at);
              return (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-medium tracking-wide">{c.code}</span>
                    <CopyButton text={c.code} label="Copy" />
                    <span className={status === "Active" ? "text-body-sm" : "text-body-sm text-ink/55"}>{status}</span>
                    <span className="ml-auto text-body-sm tabular-nums">
                      {formatPrice(c.balance)} <span className="text-ink/55">of {formatPrice(c.initial_balance)}</span>
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 text-caption text-ink/65">
                    <span>Created {dateFmt.format(new Date(c.created_at))}</span>
                    {c.expires_at ? <span>Expires {dateFmt.format(new Date(c.expires_at))}</span> : <span>No expiry</span>}
                    {c.note ? <span>{c.note}</span> : null}
                    <ActiveToggle id={c.id} active={c.is_active} />
                  </div>
                  {c.gift_card_redemptions.length ? (
                    <details className="mt-2">
                      <summary className="min-h-9 cursor-pointer text-caption text-ink/70">Used on {uses.length} {uses.length === 1 ? "order" : "orders"}</summary>
                      <ul className="mt-1 space-y-1 pl-4 text-caption">
                        {c.gift_card_redemptions.map((r) => (
                          <li key={r.id} className={r.reversed_at ? "text-ink/45 line-through" : undefined}>
                            {formatDateTime(r.created_at)} · {formatPrice(r.amount)}
                            {r.orders ? (
                              <>
                                {" · "}
                                <Link href={`/admin/orders/${r.orders.order_number}`} className="underline underline-offset-2">
                                  {r.orders.order_number}
                                </Link>
                              </>
                            ) : null}
                            {r.reversed_at ? " (returned to the card)" : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
