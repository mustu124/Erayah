import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// The cart holds only what the shopper chose. Prices, totals and stock are
// always read from the database on the server, never from here.

export const MAX_QUANTITY = 20;

export type CartLine = {
  productId: number;
  slug: string;
  /** Option label (e.g. "Pink") for products sold with variants, else null. */
  variantLabel: string | null;
  quantity: number;
};

type CartItem = { productId: number; slug: string; variantLabel?: string | null };

/** One line per product and option. */
export const lineKey = (line: { productId: number; variantLabel?: string | null }) =>
  `${line.productId}:${line.variantLabel ?? ""}`;

type CartState = {
  lines: CartLine[];
  add: (item: CartItem, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (item, quantity = 1) =>
        set((state) => {
          const key = lineKey(item);
          if (state.lines.some((l) => lineKey(l) === key)) {
            return {
              lines: state.lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clamp(l.quantity + quantity) } : l)),
            };
          }
          return {
            lines: [...state.lines, { productId: item.productId, slug: item.slug, variantLabel: item.variantLabel ?? null, quantity: clamp(quantity) }],
          };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clamp(quantity) } : l)),
        })),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => lineKey(l) !== key) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "erayah-cart",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 lines had no variantLabel.
      migrate: (persisted) => {
        const state = persisted as { lines?: Partial<CartLine>[] };
        return { lines: (state.lines ?? []).map((l) => ({ ...l, variantLabel: l.variantLabel ?? null })) as CartLine[] };
      },
    },
  ),
);

export const selectCartCount = (state: CartState) => state.lines.reduce((n, l) => n + l.quantity, 0);
