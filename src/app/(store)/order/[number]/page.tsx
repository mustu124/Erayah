import { Download } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AwaitPayment } from "@/components/checkout/AwaitPayment";
import { buttonClasses, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { Skeleton } from "@/components/ui/Skeleton";
import { getOrderForCustomer } from "@/lib/data/order";
import { publicEnv } from "@/lib/env/public";
import { routes } from "@/lib/routes";
import { publicStorageUrl } from "@/lib/supabase/storage";
import { whatsappUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function OrderPage(props: PageProps<"/order/[number]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 lg:pt-14">
      <Suspense fallback={<OrderSkeleton />}>
        <Order {...props} />
      </Suspense>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="mt-8 h-64 w-full" />
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

async function Order({ params, searchParams }: PageProps<"/order/[number]">) {
  const [{ number }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.t === "string" ? query.t : null;
  const order = await getOrderForCustomer(decodeURIComponent(number), token);
  if (!order) notFound();

  const firstName = order.customer_name.split(/\s+/)[0];
  const askUs = (
    <a
      href={whatsappUrl(publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER, { orderNumber: order.order_number })}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
    >
      message us on WhatsApp
    </a>
  );

  if (order.status === "pending_payment") {
    return (
      <div className="text-center">
        <h1 className="font-heading text-h1 text-ink">Confirming your payment…</h1>
        <p className="mt-3 text-body text-ink/75">Order {order.order_number}. This usually takes a few seconds.</p>
        <AwaitPayment>
          <p className="mt-6 text-body text-ink/75">
            This is taking longer than usual. If money has left your account, your order will be confirmed shortly
            and this page will update. If it doesn&apos;t, {askUs} with your order number.
          </p>
        </AwaitPayment>
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="text-center">
        <h1 className="font-heading text-h1 text-ink">This order wasn&apos;t completed</h1>
        {order.payment_status === "paid" ? (
          <p className="mt-3 text-body text-ink/75">
            Your payment for order {order.order_number} arrived after the pieces had sold out, so we couldn&apos;t
            complete it. A full refund is on its way to your original payment method. Please {askUs} if you have any
            questions.
          </p>
        ) : (
          <p className="mt-3 text-body text-ink/75">No payment was taken for order {order.order_number}.</p>
        )}
        <ButtonLink href={routes.shopAll} className="mt-8">
          Continue shopping
        </ButtonLink>
      </div>
    );
  }

  const gross = order.total + order.gift_card_amount;
  const invoiceHref = routes.invoice(order.order_number, order.access_token);

  return (
    <article>
      <header className="text-center">
        <p className="font-body text-label font-medium text-gold uppercase">Order confirmed</p>
        <h1 className="mt-3 font-heading text-display text-ink">Thank you, {firstName}</h1>
        <p className="mt-3 text-body text-ink/75">
          Order <span className="font-medium text-ink">{order.order_number}</span>
          {order.paid_at ? ` · ${dateFmt.format(new Date(order.paid_at))}` : ""}
        </p>
        <p className="mt-2 text-body text-ink/75">Your pieces will be delivered in 7–10 working days.</p>
      </header>

      <section aria-labelledby="bill-heading" className="mt-10 border border-mist bg-paper p-5 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="bill-heading" className="font-heading text-h2 text-ink">
            Your bill
          </h2>
          {order.invoice_number ? <p className="text-caption text-ink/65">Invoice {order.invoice_number}</p> : null}
        </div>

        <ul className="mt-6 divide-y divide-mist border-y border-mist">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <div className="relative size-18 shrink-0 overflow-hidden bg-ivory">
                {item.image_path_snapshot ? (
                  <Image
                    src={publicStorageUrl("product-images", item.image_path_snapshot)}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 text-body-sm">
                <p className="text-ink">{item.name_snapshot}</p>
                {item.variant_label ? <p className="text-ink/65">{item.variant_label}</p> : null}
                <p className="text-ink/65">
                  {item.quantity} × <Price amount={item.unit_price} />
                </p>
              </div>
              <Price amount={item.line_total} className="text-body-sm text-ink" />
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 text-body-sm text-ink sm:ml-auto sm:max-w-xs">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>
              <Price amount={order.subtotal} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{order.shipping_fee ? <Price amount={order.shipping_fee} /> : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-mist pt-2 font-medium">
            <dt>Total</dt>
            <dd>
              <Price amount={gross} />
            </dd>
          </div>
          <p className="text-caption text-ink/60">Inclusive of all taxes</p>
          {order.gift_card_amount > 0 ? (
            <div className="flex justify-between pt-2">
              <dt>Paid by gift card {order.gift_card_code}</dt>
              <dd>
                <Price amount={order.gift_card_amount} />
              </dd>
            </div>
          ) : null}
          {order.total > 0 ? (
            <div className="flex justify-between">
              <dt>Paid online</dt>
              <dd>
                <Price amount={order.total} />
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 grid gap-6 border-t border-mist pt-6 text-body-sm text-ink sm:grid-cols-2">
          <div>
            <h3 className="font-body text-label font-medium text-gold uppercase">Delivering to</h3>
            <address className="mt-2 not-italic">
              {order.customer_name}
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
          </div>
          <div>
            <h3 className="font-body text-label font-medium text-gold uppercase">Payment</h3>
            <p className="mt-2">
              {order.payment_method === "gift_card" ? "Gift card" : "Paid online via Razorpay"}
              {order.razorpay_payment_id ? (
                <>
                  <br />
                  <span className="text-ink/65">Payment ID {order.razorpay_payment_id}</span>
                </>
              ) : null}
            </p>
            {order.is_gift || order.gift_note ? (
              <>
                <h3 className="mt-4 font-body text-label font-medium text-gold uppercase">Gift</h3>
                <p className="mt-2">
                  {order.is_gift ? "Packed as a gift, without prices." : null}
                  {order.gift_note ? <span className="block text-ink/75">“{order.gift_note}”</span> : null}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <a href={invoiceHref} download className={buttonClasses("solid")}>
          <Icon icon={Download} size={16} />
          Download invoice (PDF)
        </a>
        <p className="max-w-md text-body-sm text-ink/70">
          This is your bill. Please download or screenshot it for your records.
        </p>
        <p className="text-body-sm text-ink/70">Questions about your order? Please {askUs}.</p>
        <ButtonLink href={routes.shopAll} variant="link">
          Continue shopping
        </ButtonLink>
      </div>
    </article>
  );
}
