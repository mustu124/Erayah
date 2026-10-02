import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// The cart holds only what the shopper chose. Prices, totals and stock are
// always read from the database on the server, never from here.

export const MAX_QUANTITY = 20;

export type CartLine = {
  productId: number;
  slug: string;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  add: (item: { productId: number; slug: string }, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === item.productId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === item.productId ? { ...l, quantity: clamp(l.quantity + quantity) } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...item, quantity: clamp(quantity) }] };
        }),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.productId === productId ? { ...l, quantity: clamp(quantity) } : l)),
        })),
      remove: (productId) => set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "erayah-cart", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const selectCartCount = (state: CartState) => state.lines.reduce((n, l) => n + l.quantity, 0);
