"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const EVERY_MS = 3000;
const SLOW_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 5 * 60_000;

/**
 * While a payment is being confirmed (Razorpay's webhook can lag the
 * browser), re-renders the page every few seconds. Shows `children` (a
 * "taking longer than usual" note) after 30 seconds.
 */
export function AwaitPayment({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const waited = Date.now() - started;
      if (waited > SLOW_AFTER_MS) setSlow(true);
      if (waited > GIVE_UP_AFTER_MS) clearInterval(timer);
      else router.refresh();
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div role="status" aria-live="polite">
      <span className="mx-auto mt-8 block size-6 animate-spin rounded-full border-2 border-mist border-t-ink" aria-hidden="true" />
      {slow ? children : null}
    </div>
  );
}
