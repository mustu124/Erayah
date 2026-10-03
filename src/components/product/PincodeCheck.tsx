"use client";

import { useId, useState } from "react";

import { formatPrice } from "@/lib/format/price";

type Quote = { fee: number; estDaysMin: number; estDaysMax: number };

/** "Check delivery to your pincode": shows the shipping charge and estimate from the shipping rules. */
export function PincodeCheck({ slug, quantity }: { slug: string; quantity: number }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; message?: string; quote?: Quote; for?: string }>({
    status: "idle",
  });

  const check = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setState({ status: "error", message: "Please enter a 6-digit pincode." });
      return;
    }
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/shipping-quote?pincode=${pincode}&slug=${encodeURIComponent(slug)}&quantity=${quantity}`);
      const body = (await response.json()) as Quote & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Couldn't check that pincode.");
      setState({ status: "idle", quote: body, for: pincode });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Couldn't check that pincode." });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 text-body-sm text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
      >
        Check delivery to your pincode
      </button>
    );
  }

  return (
    <div className="mt-2">
      <form onSubmit={check} className="flex max-w-xs">
        <label htmlFor={id} className="sr-only">
          Pincode
        </label>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          className="h-11 min-w-0 flex-1 border border-r-0 border-mist bg-paper px-3 text-body-sm text-ink focus:border-ink"
        />
        <button
          type="submit"
          disabled={state.status === "loading"}
          className="h-11 border border-ink px-4 text-[12px] font-medium tracking-[0.12em] text-ink uppercase transition-colors duration-300 hover:bg-ink hover:text-ivory disabled:opacity-50"
        >
          Check
        </button>
      </form>
      <p className="mt-2 min-h-5 text-body-sm text-ink/80" aria-live="polite">
        {state.status === "loading"
          ? "Checking…"
          : state.status === "error"
            ? state.message
            : state.quote
              ? `${state.quote.fee ? `Shipping to ${state.for}: ${formatPrice(state.quote.fee)}` : `Free shipping to ${state.for}`} · delivered in ${state.quote.estDaysMin}–${state.quote.estDaysMax} working days`
              : null}
      </p>
    </div>
  );
}
