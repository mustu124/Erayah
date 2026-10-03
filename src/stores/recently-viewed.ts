import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const LIMIT = 10;

type RecentlyViewedState = {
  /** Product slugs, most recent first (at most 10). */
  slugs: string[];
  track: (slug: string) => void;
};

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      slugs: [],
      track: (slug) => set((state) => ({ slugs: [slug, ...state.slugs.filter((s) => s !== slug)].slice(0, LIMIT) })),
    }),
    { name: "erayah-recently-viewed", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
