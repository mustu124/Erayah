import { Search } from "lucide-react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

/** Wide search field with a square ink button attached on the right. */
export function SearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <form role="search" action={routes.search} className={cn("flex w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Search jewellery
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Search jewellery…"
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 min-w-0 flex-1 rounded-none border border-r-0 border-ink/30 bg-paper px-3 text-body-sm text-ink placeholder:text-ink/50 focus:border-ink"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex size-11 shrink-0 items-center justify-center bg-ink text-ivory transition-opacity duration-300 hover:opacity-90"
      >
        <Icon icon={Search} size={18} />
      </button>
    </form>
  );
}
