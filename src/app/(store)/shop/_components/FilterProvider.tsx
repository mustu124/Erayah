"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useOptimistic, useTransition, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { hrefWith, type Filters } from "@/lib/collection/params";

type FilterContext = {
  filters: Filters;
  /** How the default order is named: "Curated", or "Relevance" on search. */
  curatedLabel: string;
  pending: boolean;
  /** Applies new filters: updates the URL (page resets to 1) and re-renders on the server. */
  apply: (update: (current: Filters) => Filters) => void;
};

const Context = createContext<FilterContext | null>(null);

export function useFilters(): FilterContext {
  const value = useContext(Context);
  if (!value) throw new Error("useFilters must be used inside <FilterProvider>");
  return value;
}

/**
 * Holds the current filters (from the URL). Changes push a new URL inside a
 * transition, so Server Components re-render the grid without a page reload;
 * the selection shows immediately (optimistic) while the grid refreshes.
 */
export function FilterProvider({
  path,
  filters,
  curatedLabel = "Curated",
  children,
}: {
  path: string;
  filters: Filters;
  curatedLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(filters);

  const apply = useCallback(
    (update: (current: Filters) => Filters) => {
      const next = { ...update(optimistic), page: 1 };
      startTransition(() => {
        setOptimistic(next);
        router.push(hrefWith(path, next), { scroll: false });
      });
    },
    [optimistic, path, router, setOptimistic],
  );

  return <Context.Provider value={{ filters: optimistic, curatedLabel, pending, apply }}>{children}</Context.Provider>;
}

/** Softly fades its children while new results load. */
export function PendingFade({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFilters();
  return (
    <div aria-busy={pending} className={cn("transition-opacity duration-300", pending && "opacity-50", className)}>
      {children}
    </div>
  );
}

/** Toggles a value in a list. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
