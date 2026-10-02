import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WishlistItem = {
  productId: number;
  slug: string;
};

type WishlistState = {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (productId: number) => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],
      toggle: (item) =>
        set((state) =>
          state.items.some((i) => i.productId === item.productId)
            ? { items: state.items.filter((i) => i.productId !== item.productId) }
            : { items: [...state.items, item] },
        ),
      remove: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
    }),
    { name: "erayah-wishlist", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const selectWishlistCount = (state: WishlistState) => state.items.length;
export const selectIsWishlisted = (productId: number) => (state: WishlistState) =>
  state.items.some((i) => i.productId === productId);
