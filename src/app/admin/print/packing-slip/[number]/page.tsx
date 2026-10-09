import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ElephantMark, Wordmark } from "@/components/ui/Logo";
import { requireAdminPage } from "@/lib/admin/auth";
import { getOrderByNumber } from "@/lib/data/order";
import { formatPrice } from "@/lib/format/price";

import { PrintOnLoad } from "./PrintOnLoad";

export const metadata: Metadata = { title: "Packing slip" };
export const instant = false;

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

async function Slip({ params }: PageProps<"/admin/print/packing-slip/[number]">) {
  await requireAdminPage();
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order) notFound();
  const showPrices = !order.is_gift;

  return (
    <article className="slip mx-auto bg-paper p-8 text-ink print:p-0">
      <header className="flex items-start justify-between border-b border-gold pb-4">
        <div className="flex items-center gap-2">
          <ElephantMark className="h-8 w-auto" />
          <div>
            <Wordmark className="h-4 w-auto" />
            <p className="mt-0.5 font-script text-[11px] text-gold italic">Heirlooms, Reimagined</p>
          </div>
        </div>
        <div className="text-right text-[11px]">
          <p className="font-heading text-[16px]">Packing slip</p>
          <p>Order {order.order_number}</p>
          <p>{dateFmt.format(new Date(order.paid_at ?? order.created_at))}</p>
        </div>
      </header>

      <section className="mt-4 text-[12px]">
        <p className="text-[10px] font-medium tracking-[0.14em] text-gold uppercase">Ship to</p>
        <address className="mt-1 leading-relaxed not-italic">
          <strong className="font-medium">{order.customer_name}</strong>
          <br />
          {order.address_line1}
          {order.address_line2 ? (
            <>
              <br />
              {order.address_line2}
            </>
          ) : null}
          {order.landmark ? (
            <>
              <br />
              Landmark: {order.landmark}
            </>
          ) : null}
          <br />
          {order.city}, {order.state} {order.pincode}
          <br />
          +91 {order.phone}
        </address>
      </section>

      <table className="mt-5 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-ink/30 text-left text-[10px] tracking-[0.12em] uppercase">
            <th className="py-1.5 font-medium">Piece</th>
            <th className="py-1.5 text-center font-medium">Qty</th>
            {showPrices ? <th className="py-1.5 text-right font-medium">Amount</th> : null}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-mist">
              <td className="py-2">
                {item.name_snapshot}
                {item.variant_label ? ` · ${item.variant_label}` : ""}
              </td>
              <td className="py-2 text-center">{item.quantity}</td>
              {showPrices ? <td className="py-2 text-right">{formatPrice(item.line_total)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {showPrices ? (
        <p className="mt-2 text-right text-[12px]">
          Total <strong className="font-medium">{formatPrice(order.total + order.gift_card_amount)}</strong>
        </p>
      ) : null}

      {order.gift_note ? (
        <section className="mt-6 border border-gold px-5 py-4 text-center">
          <p className="text-[10px] font-medium tracking-[0.14em] text-gold uppercase">A note for you</p>
          <p className="mt-2 font-heading text-[15px] leading-relaxed whitespace-pre-line">{order.gift_note}</p>
        </section>
      ) : null}

      <footer className="mt-8 text-center text-[10px] text-ink/70">
        <p>Thank you for choosing Erayah. Handcrafted pieces carry small, natural variations.</p>
        <p className="mt-1">Returns only for transit damage or an incorrect piece, unworn and in original packaging. Credit is issued as a gift card.</p>
      </footer>
      <PrintOnLoad />
    </article>
  );
}

export default function PackingSlipPage(props: PageProps<"/admin/print/packing-slip/[number]">) {
  return (
    <main className="min-h-dvh bg-paper py-6 print:py-0">
      <style>{`
        @page { size: A5; margin: 10mm; }
        .slip { width: 148mm; max-width: 100%; }
        @media print { body { background: #fff; } section[aria-label="Notifications alt+T"] { display: none; } }
      `}</style>
      <Suspense fallback={<p className="text-center text-body-sm text-ink/60">Preparing the packing slip…</p>}>
        <Slip {...props} />
      </Suspense>
    </main>
  );
}
