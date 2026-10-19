"use client";

import { useEffect } from "react";

import { useCart } from "@/stores/cart";

const PENDING_KEY = "erayah-pending-payment";

/**
 * On a confirmed order's page: if this tab was waiting on this order's
 * payment (its confirmation came by Razorpay check or webhook rather than the
 * checkout callback), empty the cart now that the order is certain.
 */
export function ClearPendingCart({ orderNumber }: { orderNumber: string }) {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null") as { orderNumber?: string } | null;
      if (pending?.orderNumber !== orderNumber) return;
      sessionStorage.removeItem(PENDING_KEY);
      clear();
    } catch {
      // Storage blocked: nothing was pending in this tab.
    }
  }, [orderNumber, clear]);
  return null;
}
