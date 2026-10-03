"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Price } from "@/components/ui/Price";
import { Skeleton } from "@/components/ui/Skeleton";
import type { QuoteResponse } from "@/lib/checkout/types";
import { cn } from "@/lib/cn";
import { IVORY_BLUR } from "@/lib/images";

type OrderSummaryProps = {
  /** Distinguishes the two copies (mobile and desktop) so ids stay unique. */
  idPrefix: string;
  quote: QuoteResponse | null;
  loading: boolean;
  /** Messages for lines that can't be bought, keyed by product id. */
  lineErrors: Record<number, string>;
  onRemoveLine: (productId: number) => void;
  giftCardCode: string | null;
  giftCardError?: string;
  onApplyGiftCard: (code: string) => void;
  onRemoveGiftCard: () => void;
};

/** Items, gift card and totals, priced by the server. */
export function OrderSummary({
  idPrefix,
  quote,
  loading,
  lineErrors,
  onRemoveLine,
  giftCardCode,
  giftCardError,
  onApplyGiftCard,
  onRemoveGiftCard,
}: OrderSummaryProps) {
  const [code, setCode] = useState("");
  const inputId = `${idPrefix}-gift-card`;

  return (
    <div className={cn("transition-opacity duration-300", loading && quote && "opacity-60")} aria-busy={loading}>
      {quote ? (
        <ul className="divide-y divide-mist">
          {quote.lines.map((line) => (
            <li key={`${line.product_id}:${line.variant_label ?? ""}`} className="flex gap-4 py-4 first:pt-0">
              <div className="relative size-18 shrink-0 overflow-hidden bg-ivory">
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={IVORY_BLUR}
                  />
                ) : null}
                <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] text-ivory tabular-nums">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-body-sm">
                <p className="text-ink">{line.name}</p>
                {line.variant_label ? <p className="text-ink/65">{line.variant_label}</p> : null}
                <p className="text-ink/65">
                  {line.quantity} × <Price amount={line.unit_price} />
                </p>
              </div>
              <Price amount={line.line_total} className="text-body-sm text-ink" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <Skeleton className="h-18 w-full" />
          <Skeleton className="h-18 w-full" />
        </div>
      )}

      {Object.entries(lineErrors).map(([productId, message]) => (
        <div key={productId} role="alert" className="mt-2 flex items-center justify-between gap-3 bg-ivory px-3 py-2 text-body-sm text-plum">
          <span>{message}</span>
          <Button variant="link" className="min-h-9 shrink-0" onClick={() => onRemoveLine(Number(productId))}>
            Remove it
          </Button>
        </div>
      ))}

      <div className="mt-5 border-t border-mist pt-5">
        {giftCardCode ? (
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-ink">
              Gift card <span className="font-medium tracking-wide">{giftCardCode}</span> applied
            </span>
            <Button variant="link" className="min-h-9" onClick={onRemoveGiftCard}>
              Remove
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) onApplyGiftCard(code.trim().toUpperCase());
            }}
          >
            <label htmlFor={inputId} className="mb-1.5 block text-body-sm text-ink">
              Gift card
            </label>
            <div className="flex gap-2">
              <Input
                id={inputId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Enter code"
                aria-invalid={giftCardError ? true : undefined}
                aria-describedby={giftCardError ? `${inputId}-error` : undefined}
                className={cn("uppercase placeholder:normal-case", giftCardError && "border-plum")}
              />
              <Button type="submit" variant="outline" className="shrink-0 px-5">
                Apply
              </Button>
            </div>
            {giftCardError ? (
              <p id={`${inputId}-error`} className="mt-1 text-caption text-plum">
                {giftCardError}
              </p>
            ) : null}
          </form>
        )}
      </div>

      <dl className="mt-5 space-y-2 border-t border-mist pt-5 text-body-sm text-ink">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{quote ? <Price amount={quote.subtotal} /> : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd className={cn(quote?.shippingFee == null && "text-ink/60")}>
            {quote?.shippingFee == null ? "Enter your pincode" : quote.shippingFee === 0 ? "Free" : <Price amount={quote.shippingFee} />}
          </dd>
        </div>
        {quote && quote.giftCardAmount > 0 ? (
          <div className="flex justify-between">
            <dt>Gift card</dt>
            <dd>
              −<Price amount={quote.giftCardAmount} />
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-mist pt-3">
          <dt className="font-medium">Total</dt>
          <dd className="font-heading text-h3" data-testid={`${idPrefix}-total`}>
            {quote ? <Price amount={quote.total} /> : "—"}
          </dd>
        </div>
        <p className="text-caption text-ink/60">
          Inclusive of all taxes
          {quote?.estDaysMin ? ` · delivered in ${quote.estDaysMin}–${quote.estDaysMax} working days` : ""}
        </p>
      </dl>
    </div>
  );
}
