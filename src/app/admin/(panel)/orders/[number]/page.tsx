import { Download, Mail, MessageCircle, Phone, Printer } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/admin/CopyButton";
import { PageHeader, Panel, StatusPill } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { requireAdminPage } from "@/lib/admin/auth";
import { NEXT_STATUSES } from "@/lib/admin/orders";
import { formatDateTimeLong } from "@/lib/admin/time";
import { getOrderByNumber } from "@/lib/data/order";
import { formatPrice } from "@/lib/format/price";
import { IVORY_BLUR } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/storage";

import { NoteForm, RecordsForm, StatusForm } from "./OrderForms";

export const metadata: Metadata = { title: "Order" };

const RAZORPAY_DASHBOARD = "https://dashboard.razorpay.com/app";

function whatsappTemplate(status: string, firstName: string, orderNumber: string) {
  const hi = `Hello ${firstName}, this is Erayah.`;
  switch (status) {
    case "packed":
      return `${hi} Your order ${orderNumber} is packed and will be on its way soon.`;
    case "shipped":
      return `${hi} Your order ${orderNumber} has been shipped and is on its way to you.`;
    case "delivered":
      return `${hi} We hope you love your pieces from order ${orderNumber}. Thank you for choosing Erayah.`;
    case "cancelled":
      return `${hi} Your order ${orderNumber} has been cancelled. Any payment will be refunded to the original method.`;
    default:
      return `${hi} Thank you for your order ${orderNumber}. We're preparing your pieces; they'll reach you in 7–10 working days.`;
  }
}

export default async function OrderDetailPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireAdminPage();
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order) notFound();

  const { data: events } = await createAdminClient()
    .from("order_events")
    .select("id, type, from_value, to_value, note, actor_email, created_at")
    .eq("order_id", order.id)
    .order("created_at");

  const firstName = order.customer_name.split(/\s+/)[0];
  const phone = order.phone.replace(/\D/g, "").slice(-10);
  const whatsapp = `https://wa.me/91${phone}?text=${encodeURIComponent(whatsappTemplate(order.status, firstName, order.order_number))}`;
  const address = [
    order.customer_name,
    order.address_line1,
    order.address_line2,
    order.landmark ? `Landmark: ${order.landmark}` : null,
    `${order.city}, ${order.state} ${order.pincode}`,
    `Phone: +91 ${phone}`,
  ]
    .filter(Boolean)
    .join("\n");
  const gross = order.total + order.gift_card_amount;
  const paid = order.payment_status === "paid" || order.payment_status === "refunded";
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex min-h-9 items-center text-body-sm text-ink/70 hover:text-ink">
        ← Orders
      </Link>
      <PageHeader
        title={order.order_number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatDateTimeLong(order.created_at)} <StatusPill status={order.status} /> <StatusPill status={order.payment_status} />
          </span>
        }
        actions={
          <>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "px-4")}>
              <Icon icon={MessageCircle} size={16} /> WhatsApp
            </a>
            <a href={`/admin/print/packing-slip/${order.order_number}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "px-4")}>
              <Icon icon={Printer} size={16} /> Packing slip
            </a>
            {paid ? (
              <a href={`/admin/orders/${order.order_number}/invoice`} className={buttonClasses("outline", "px-4")} download>
                <Icon icon={Download} size={16} /> Invoice
              </a>
            ) : null}
          </>
        }
      />

      {order.gift_note || order.is_gift ? (
        <div className="mb-6 border border-gold bg-gold-light/50 px-4 py-3 text-body text-ink" role="note">
          <p className="text-label font-medium uppercase">{order.is_gift ? "Gift order: no prices on the packing slip" : "Gift note"}</p>
          {order.gift_note ? <p className="mt-1 font-heading text-h3 whitespace-pre-line">“{order.gift_note}”</p> : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title={`${itemCount} ${itemCount === 1 ? "piece" : "pieces"}`}>
            <ul className="divide-y divide-mist">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-3 first:pt-0">
                  <div className="relative size-16 shrink-0 overflow-hidden bg-ivory">
                    {item.image_path_snapshot ? (
                      <Image src={publicStorageUrl("product-images", item.image_path_snapshot)} alt="" fill sizes="64px" className="object-cover" placeholder="blur" blurDataURL={IVORY_BLUR} />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-body-sm">
                    {item.product_id ? (
                      <Link href={`/admin/products/${item.product_id}`} className="font-medium hover:underline">
                        {item.name_snapshot}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.name_snapshot}</p>
                    )}
                    {item.variant_label ? <p className="text-ink/65">{item.variant_label}</p> : null}
                    <p className="text-ink/65">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <p className="text-body-sm tabular-nums">{formatPrice(item.line_total)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-mist pt-4 text-body-sm sm:ml-auto sm:max-w-xs">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{order.shipping_fee ? formatPrice(order.shipping_fee) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-mist pt-1.5 font-medium">
                <dt>Order total</dt>
                <dd className="tabular-nums">{formatPrice(gross)}</dd>
              </div>
              <div className="flex justify-between text-ink/65">
                <dt>GST included</dt>
                <dd className="tabular-nums">{formatPrice(order.gst_amount)}</dd>
              </div>
              {order.gift_card_amount > 0 ? (
                <div className="flex justify-between">
                  <dt>Gift card {order.gift_card_code}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.gift_card_amount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between font-medium">
                <dt>{paid ? "Paid online" : "To pay online"}</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Status">
            <StatusForm orderId={order.id} next={NEXT_STATUSES[order.status]} />
          </Panel>

          <Panel title="Shipping records (internal)">
            <RecordsForm
              orderId={order.id}
              initial={{ courierName: order.courier_name ?? "", trackingNumber: order.tracking_number ?? "", internalNotes: order.internal_notes ?? "" }}
            />
          </Panel>

          <Panel title="Timeline">
            <ol className="space-y-3">
              {(events ?? []).map((e) => (
                <li key={e.id} className="border-l-2 border-gold-light pl-3 text-body-sm">
                  <p>
                    {e.type === "status_change" && e.to_value ? (
                      <>
                        {e.from_value ? <>Status {e.from_value.replace("_", " ")} → </> : "Status "}
                        <strong className="font-medium">{e.to_value.replace("_", " ")}</strong>
                      </>
                    ) : e.type === "payment" ? (
                      <span>Payment{e.to_value ? `: ${e.to_value.replace("_", " ")}` : ""}</span>
                    ) : null}
                    {e.note ? (
                      <span className={e.note.startsWith("REFUND NEEDED") ? "block font-medium text-plum" : "block text-ink/80"}>{e.note}</span>
                    ) : null}
                  </p>
                  <p className="text-caption text-ink/55">
                    {formatDateTimeLong(e.created_at)}
                    {e.actor_email ? ` · ${e.actor_email}` : ""}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-mist pt-4">
              <NoteForm orderId={order.id} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-medium">{order.customer_name}</p>
            <div className="mt-3 flex flex-col gap-2 text-body-sm">
              <a href={`tel:+91${phone}`} className="inline-flex min-h-9 items-center gap-2 hover:underline">
                <Icon icon={Phone} size={15} /> +91 {phone}
              </a>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-2 hover:underline">
                <Icon icon={MessageCircle} size={15} /> WhatsApp
              </a>
              {order.email ? (
                <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Erayah order ${order.order_number}`)}`} className="inline-flex min-h-9 items-center gap-2 break-all hover:underline">
                  <Icon icon={Mail} size={15} /> {order.email}
                </a>
              ) : null}
            </div>
          </Panel>

          <Panel title="Ship to" actions={<CopyButton text={address} label="Copy address" />}>
            <address className="text-body-sm whitespace-pre-line not-italic">{address}</address>
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-2 text-body-sm">
              <div>
                <dt className="text-caption text-ink/60">Method</dt>
                <dd>{order.payment_method === "gift_card" ? "Gift card" : "Razorpay (online)"}</dd>
              </div>
              {order.razorpay_order_id ? (
                <div>
                  <dt className="text-caption text-ink/60">Razorpay order</dt>
                  <dd>
                    <a href={`${RAZORPAY_DASHBOARD}/orders/${order.razorpay_order_id}`} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-ink/30 underline-offset-4">
                      {order.razorpay_order_id} ↗
                    </a>
                  </dd>
                </div>
              ) : null}
              {order.razorpay_payment_id ? (
                <div>
                  <dt className="text-caption text-ink/60">Razorpay payment</dt>
                  <dd>
                    <a href={`${RAZORPAY_DASHBOARD}/payments/${order.razorpay_payment_id}`} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-ink/30 underline-offset-4">
                      {order.razorpay_payment_id} ↗
                    </a>
                  </dd>
                </div>
              ) : null}
              {order.invoice_number ? (
                <div>
                  <dt className="text-caption text-ink/60">Invoice</dt>
                  <dd>{order.invoice_number}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
