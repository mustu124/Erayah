"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { hasActiveFilters } from "@/lib/collection/params";
import type { Scope } from "@/lib/collection/scopes";
import type { Facets } from "@/lib/data/collection";

import { FilterPanel } from "./FilterPanel";
import { useFilters } from "./FilterProvider";
import { SortSelect } from "./SortSelect";

/** Mobile: FILTERS (ink) and SORT BY side by side; filters open in a full-height drawer. */
export function MobileFilterBar({ scope, facets, total }: { scope: Scope; facets: Facets; total: number }) {
  const [open, setOpen] = useState(false);
  const { filters, pending } = useFilters();
  const active = hasActiveFilters(filters);

  return (
    <div className="grid grid-cols-2 gap-3 lg:hidden">
      <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
        Filters{active ? " ·" : ""}
      </Button>
      <SortSelect variant="button" />

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        title="Filters"
        footer={
          <Button className="w-full" onClick={() => setOpen(false)} disabled={pending}>
            {pending ? "Updating…" : `Show ${total} ${total === 1 ? "piece" : "pieces"}`}
          </Button>
        }
      >
        <div className="px-5 py-6">
          <FilterPanel scope={scope} facets={facets} />
        </div>
      </Drawer>
    </div>
  );
}
