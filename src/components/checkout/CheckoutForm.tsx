"use client";

import { ChevronDown, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PAYMENT_LOGOS, PaymentLogo } from "@/components/ui/BrandIcons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { Select } from "@/components/ui/Select";
import { checkoutSchema, fieldErrors, PINCODE_RE } from "@/lib/checkout/schema";
import { INDIAN_STATES } from "@/lib/checkout/states";
import type { CheckoutError, CreateResponse, QuoteResponse } from "@/lib/checkout/types";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { useHydrated } from "@/lib/use-hydrated";
import { whatsappUrl } from "@/lib/whatsapp";
import { useCart } from "@/stores/cart";

import { Field } from "./Field";
import { OrderSummary } from "./OrderSummary";
import { loadRazorpay, type RazorpaySuccess } from "./razorpay";

const PAYMENT_FAILED = "Payment didn't go through. Your cart is safe, please try again.";

type Form = {
  email: string;
  phone: string;
  name: string;
  pincode: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
};

const EMPTY: Form = { email: "", phone: "", name: "", pincode: "", line1: "", line2: "", landmark: "", city: "", state: "" };

// Field order on the page, for focusing the first error.
const FIELD_IDS: Record<string, string> = {
  "contact.email": "email",
  "contact.phone": "phone",
  "address.name": "name",
  "address.pincode": "pincode",
  "address.line1": "line1",
  "address.line2": "line2",
  "address.landmark": "landmark",
  "address.city": "city",
  "address.state": "state",
  giftNote: "gift-note",
};

type Stage = "form" | "creating" | "paying" | "verifying" | "done";

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<{ ok: true; data: T } | { ok: false; error: CheckoutError }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const json = await res.json().catch(() => ({ error: "Something went wrong. Please try again." }));
    return res.ok ? { ok: true, data: json as T } : { ok: false, error: json as CheckoutError };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { ok: false, error: { error: "You seem to be offline. Please check your connection and try again." } };
  }
}

/**
 * One-page guest checkout: contact, address (pincode first, autofilled city
 * and state), gift options, summary priced by the server, and Razorpay.
 */
export function CheckoutForm({ whatsappNumber }: { whatsappNumber: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const isGift = useCart((s) => s.isGift);
  const giftNote = useCart((s) => s.giftNote);
  const setGift = useCart((s) => s.setGift);
  const removeLine = useCart((s) => s.remove);
  const clearCart = useCart((s) => s.clear);

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [giftCardCode, setGiftCardCode] = useState<string | null>(null);
  const [giftCardError, setGiftCardError] = useState<string>();
  const [quote, setQuote] = useState<{ key: string; data: QuoteResponse } | null>(null);
  const [quoteError, setQuoteError] = useState<{ key: string; error: CheckoutError } | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [payError, setPayError] = useState<string | null>(null);
  const autofilled = useRef<{ city: string; state: string } | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const items = useMemo(
    () => lines.map((l) => ({ productId: l.productId, variantLabel: l.variantLabel, quantity: l.quantity })),
    [lines],
  );
  const pincode = PINCODE_RE.test(form.pincode) ? form.pincode : "";
  const quoteKey = JSON.stringify([items, pincode, form.state, giftCardCode]);
  const loadingQuote = hydrated && items.length > 0 && quote?.key !== quoteKey && quoteError?.key !== quoteKey;

  // Price the cart on the server whenever what affects the price changes.
  useEffect(() => {
    if (!hydrated || !items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      postJson<QuoteResponse>(
        "/api/checkout/quote",
        { items, pincode, state: INDIAN_STATES.includes(form.state as never) ? form.state : "", giftCardCode },
        controller.signal,
      )
        .then((res) => {
          if (res.ok) {
            setQuote({ key: quoteKey, data: res.data });
            setQuoteError(null);
            return;
          }
          // Our own pending order holds the stock, so a fresh quote can read "sold out"
          // for it. Placing the order again reuses that hold; the server re-checks there.
          if (res.error.field?.startsWith("item.") && attempt.current) return;
          if (res.error.field === "giftCardCode") {
            // Drop the card and price again without it.
            setGiftCardError(res.error.error);
            setGiftCardCode(null);
            return;
          }
          setQuoteError({ key: quoteKey, error: res.error });
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // quoteKey captures items, pincode, state and gift card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, quoteKey]);

  // Pincode → city and state (India Post), without overwriting what the shopper typed.
  useEffect(() => {
    if (!pincode) return;
    const controller = new AbortController();
    fetch(`/api/pincode/${pincode}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((found: { city: string; state: string | null } | null) => {
        if (!found) return;
        setForm((f) => {
          const prev = autofilled.current;
          const next = { ...f };
          if (!f.city || f.city === prev?.city) next.city = found.city;
          if (found.state && (!f.state || f.state === prev?.state)) next.state = found.state;
          autofilled.current = { city: next.city, state: next.state };
          return next;
        });
        setErrors((e) => ({ ...e, "address.city": "", "address.state": "" }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pincode]);

  const update = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    const path = Object.keys(FIELD_IDS).find((p) => FIELD_IDS[p] === key);
    if (path && errors[path]) setErrors((errs) => ({ ...errs, [path]: "" }));
  };

  const lineErrors: Record<number, string> = {};
  if (quoteError?.key === quoteKey && quoteError.error.field?.startsWith("item.")) {
    lineErrors[Number(quoteError.error.field.slice(5))] = quoteError.error.error;
  }
  const generalQuoteError = quoteError?.key === quoteKey && !quoteError.error.field?.startsWith("item.") ? quoteError.error : null;
  const shownQuote = quote?.data ?? null;

  const focusFirstError = (errs: Record<string, string>) => {
    const first = Object.keys(FIELD_IDS).find((p) => errs[p]);
    if (first) document.getElementById(FIELD_IDS[first])?.focus();
  };

  const goToOrder = (orderNumber: string, token: string) => {
    setStage("done");
    clearCart();
    router.replace(routes.order(orderNumber, token));
  };

  const pay = async (order: Extract<CreateResponse, { kind: "razorpay" }>) => {
    let Razorpay;
    try {
      Razorpay = await loadRazorpay();
    } catch {
      setStage("form");
      setPayError("We couldn't load the payment window. Please check your connection and try again.");
      return;
    }
    setStage("paying");
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: "Erayah",
      description: `Order ${order.orderNumber}`,
      prefill: order.prefill,
      notes: { order_number: order.orderNumber },
      theme: { color: "#311829" },
      handler: async (response: RazorpaySuccess) => {
        setStage("verifying");
        // Whatever /verify says, the order page shows the truth (the webhook confirms too).
        await postJson("/api/checkout/verify", response);
        goToOrder(order.orderNumber, order.accessToken);
      },
      modal: {
        ondismiss: () => {
          setStage("form");
          setPayError(PAYMENT_FAILED);
        },
      },
    });
    rzp.on("payment.failed", () => setPayError(PAYMENT_FAILED));
    rzp.open();
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stage !== "form") return;
    setPayError(null);

    const parsed = checkoutSchema.safeParse({
      contact: { email: form.email, phone: form.phone },
      address: {
        name: form.name,
        pincode: form.pincode,
        line1: form.line1,
        line2: form.line2,
        landmark: form.landmark,
        city: form.city,
        state: form.state,
      },
      isGift,
      giftNote,
      giftCardCode: giftCardCode ?? undefined,
    });
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setErrors({});

    // Same details as the last attempt → same key → the same pending order.
    const fingerprint = JSON.stringify([parsed.data, items]);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    }

    setStage("creating");
    const res = await postJson<CreateResponse>("/api/checkout/create", {
      ...parsed.data,
      items,
      idempotencyKey: attempt.current.key,
    });
    if (!res.ok) {
      setStage("form");
      const err = res.error;
      if (err.code === "ATTEMPT_EXPIRED") attempt.current = null;
      if (err.fields) {
        setErrors(err.fields);
        focusFirstError(err.fields);
      }
      if (err.field === "giftCardCode") {
        setGiftCardCode(null);
        setGiftCardError(err.error);
      } else if (err.field?.startsWith("item.")) {
        setQuoteError({ key: quoteKey, error: err });
        attempt.current = null;
      } else if (err.field && FIELD_IDS[err.field]) {
        setErrors((errs) => ({ ...errs, [err.field!]: err.error }));
        focusFirstError({ [err.field]: err.error });
      }
      setPayError(err.error);
      return;
    }
    if (res.data.kind === "placed") {
      goToOrder(res.data.orderNumber, res.data.accessToken);
      return;
    }
    await pay(res.data);
  };

  if (!hydrated) {
    return <div className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10 lg:px-8" aria-busy="true" />;
  }

  if (stage === "done" || stage === "verifying") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-4 text-center" role="status">
        <p className="font-heading text-h2 text-ink">Confirming your payment…</p>
        <p className="text-body text-ink/70">Please don&apos;t close this page.</p>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="font-heading text-h1 text-ink">Your cart is empty</h1>
        <ButtonLink href={routes.shopAll}>Shop All</ButtonLink>
      </div>
    );
  }

  const busy = stage !== "form";
  const summaryProps = {
    quote: shownQuote,
    loading: loadingQuote,
    lineErrors,
    onRemoveLine: (productId: number) =>
      lines.filter((l) => l.productId === productId).forEach((l) => removeLine(`${l.productId}:${l.variantLabel ?? ""}`)),
    giftCardCode,
    giftCardError,
    onApplyGiftCard: (code: string) => {
      setGiftCardError(undefined);
      setGiftCardCode(code);
    },
    onRemoveGiftCard: () => setGiftCardCode(null),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 lg:px-8 lg:pt-10">
      <h1 className="font-heading text-h1 text-ink">Checkout</h1>

      {/* Mobile: summary collapsed at the top */}
      <details className="group mt-5 border-y border-mist lg:hidden">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between text-body-sm text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span className="group-open:hidden">Show order summary</span>
            <span className="hidden group-open:inline">Hide order summary</span>
            <Icon icon={ChevronDown} size={16} className="transition-transform duration-300 group-open:rotate-180" />
          </span>
          <span className="font-heading text-h3">{shownQuote ? <Price amount={shownQuote.total} /> : "—"}</span>
        </summary>
        <div className="pt-2 pb-5">
          <OrderSummary idPrefix="mobile" {...summaryProps} />
        </div>
      </details>

      <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
        <form onSubmit={placeOrder} noValidate className="space-y-10">
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="font-body text-label font-medium text-ink uppercase">
              Contact
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={update("email")}
                error={errors["contact.email"]}
              />
              <Field
                id="phone"
                label="Mobile number"
                type="tel"
                autoComplete="tel-national"
                inputMode="numeric"
                prefix="+91"
                maxLength={14}
                value={form.phone}
                onChange={update("phone")}
                error={errors["contact.phone"]}
                hint="For delivery updates from the courier."
              />
            </div>
          </section>

          <section aria-labelledby="address-heading">
            <h2 id="address-heading" className="font-body text-label font-medium text-ink uppercase">
              Delivery address
            </h2>
            <p className="mt-1 text-caption text-ink/65">We deliver across India.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="name"
                label="Full name"
                autoComplete="shipping name"
                value={form.name}
                onChange={update("name")}
                error={errors["address.name"]}
                className="sm:col-span-2"
              />
              <Field
                id="pincode"
                label="Pincode"
                autoComplete="shipping postal-code"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={update("pincode")}
                error={errors["address.pincode"] || (generalQuoteError?.field === "address.pincode" ? generalQuoteError.error : undefined)}
              />
              <div className="hidden sm:block" />
              <Field
                id="line1"
                label="House no., building, street"
                autoComplete="shipping address-line1"
                value={form.line1}
                onChange={update("line1")}
                error={errors["address.line1"]}
                className="sm:col-span-2"
              />
              <Field
                id="line2"
                label="Area, locality"
                optional
                autoComplete="shipping address-line2"
                value={form.line2}
                onChange={update("line2")}
                error={errors["address.line2"]}
                className="sm:col-span-2"
              />
              <Field
                id="landmark"
                label="Landmark"
                optional
                autoComplete="shipping address-line3"
                value={form.landmark}
                onChange={update("landmark")}
                error={errors["address.landmark"]}
                className="sm:col-span-2"
              />
              <Field
                id="city"
                label="City"
                autoComplete="shipping address-level2"
                value={form.city}
                onChange={update("city")}
                error={errors["address.city"]}
              />
              <div>
                <label htmlFor="state" className="mb-1.5 block text-body-sm text-ink">
                  State
                </label>
                <Select
                  id="state"
                  name="state"
                  autoComplete="shipping address-level1"
                  value={form.state}
                  onChange={update("state")}
                  aria-invalid={errors["address.state"] ? true : undefined}
                  aria-describedby={errors["address.state"] ? "state-error" : undefined}
                  className="w-full"
                >
                  <option value="" disabled>
                    Choose a state
                  </option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                {errors["address.state"] ? (
                  <p id="state-error" className="mt-1 text-caption text-plum">
                    {errors["address.state"]}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section aria-labelledby="gift-heading">
            <h2 id="gift-heading" className="font-body text-label font-medium text-ink uppercase">
              Gift
            </h2>
            <Checkbox
              className="mt-2"
              checked={isGift}
              onChange={(e) => setGift({ isGift: e.target.checked })}
              label="This is a gift (we'll leave prices off the packing slip)"
            />
            <label htmlFor="gift-note" className="mt-3 mb-1.5 block text-body-sm text-ink">
              Gift note <span className="text-ink/55">(optional)</span>
            </label>
            <textarea
              id="gift-note"
              value={giftNote}
              onChange={(e) => setGift({ giftNote: e.target.value.slice(0, 500) })}
              rows={3}
              maxLength={500}
              aria-describedby="gift-note-count"
              className="w-full rounded-xs border border-mist bg-paper px-3 py-2 text-body text-ink focus:border-ink"
            />
            <p id="gift-note-count" className="mt-1 text-right text-caption text-ink/55 tabular-nums">
              {giftNote.length}/500
            </p>
          </section>

          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="font-body text-label font-medium text-ink uppercase">
              Payment
            </h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-mist px-4 py-4">
              <p className="flex items-center gap-2 text-body-sm text-ink">
                <Icon icon={Lock} size={14} />
                Pay securely online: UPI, Cards, Wallets, Netbanking
              </p>
              <ul className="flex items-center gap-3 text-ink/55" aria-label="Accepted payment methods">
                {PAYMENT_LOGOS.map((logo) => (
                  <li key={logo.name} title={logo.name}>
                    <PaymentLogo path={logo.path} size={18} />
                    <span className="sr-only">{logo.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div>
            {payError ? (
              <p role="alert" className="mb-4 bg-ivory px-4 py-3 text-body-sm text-plum">
                {payError}
              </p>
            ) : null}
            {generalQuoteError && !generalQuoteError.field ? (
              <p role="alert" className="mb-4 bg-ivory px-4 py-3 text-body-sm text-plum">
                {generalQuoteError.error}
              </p>
            ) : null}
            <Button type="submit" disabled={busy || Object.keys(lineErrors).length > 0} className="w-full" aria-busy={busy}>
              {busy ? "Please wait…" : "Place order"}
              {!busy && shownQuote && shownQuote.shippingFee !== null ? (
                <>
                  {" · "}
                  <Price amount={shownQuote.total} />
                </>
              ) : null}
            </Button>
            <p className="mt-3 text-center text-caption text-ink/60">
              Questions?{" "}
              <a
                href={whatsappUrl(whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-ink/40 underline-offset-4"
              >
                Message us on WhatsApp
              </a>
            </p>
          </div>
        </form>

        {/* Desktop: summary alongside, sticky */}
        <aside aria-label="Order summary" className="hidden lg:block">
          <div className={cn("sticky top-8 bg-paper-warm p-6")}>
            <h2 className="mb-5 font-body text-label font-medium text-ink uppercase">Order summary</h2>
            <OrderSummary idPrefix="desktop" {...summaryProps} />
          </div>
        </aside>
      </div>
    </div>
  );
}
