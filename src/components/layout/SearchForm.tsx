"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { cn } from "@/lib/cn";
import type { InstantResults } from "@/lib/data/search";
import { IVORY_BLUR } from "@/lib/images";
import { routes } from "@/lib/routes";
import { QUICK_SEARCHES } from "@/lib/search/quick";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

type Option = { id: string; href: string };

/**
 * Wide search field with a square ink button. Before typing it offers quick
 * chips; after 2 characters an instant dropdown of products and category or
 * style links (arrow keys, Enter, Esc). Enter on the field opens /search.
 * Without JavaScript it is a plain GET form to /search.
 */
export function SearchForm({ id, className }: { id: string; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // Keep anything typed before the page finished loading (slow connections).
  useEffect(() => {
    const typed = input.current?.value;
    if (typed) setValue(typed);
  }, []);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ q: string; data: InstantResults } | null>(null);
  const [active, setActive] = useState(-1);

  const q = value.trim();
  const typing = q.length >= MIN_CHARS;
  const loading = typing && results?.q !== q;

  useEffect(() => {
    if (q.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (response.ok) setResults({ q, data: (await response.json()) as InstantResults });
      } catch {
        // Aborted (the shopper kept typing) or offline: keep the previous results.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const data = results?.q === q ? results.data : null;
  const searchHref = `${routes.search}?q=${encodeURIComponent(q)}`;

  const options: Option[] = !typing
    ? QUICK_SEARCHES.map((chip, i) => ({ id: `${listId}-chip-${i}`, href: chip.href }))
    : data
      ? [
          ...data.products.map((p, i) => ({ id: `${listId}-p-${i}`, href: routes.product(p.slug) })),
          ...data.links.map((l, i) => ({ id: `${listId}-l-${i}`, href: l.href })),
          ...(data.total ? [{ id: `${listId}-all`, href: searchHref }] : []),
        ]
      : [];

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!options.length) return;
      const last = options.length - 1;
      setActive((i) => (event.key === "ArrowDown" ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1));
      return;
    }
    if (event.key === "Enter" && active >= 0 && options[active]) {
      event.preventDefault();
      go(options[active].href);
    }
  };

  const optionClass = (index: number) =>
    cn("flex cursor-pointer items-center gap-3 px-4 transition-colors duration-200", index === active ? "bg-ivory" : "hover:bg-ivory/60");

  return (
    <div
      ref={wrapper}
      className={cn("relative w-full", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <form
        role="search"
        action={routes.search}
        className="flex w-full"
        onSubmit={(event) => {
          event.preventDefault();
          if (q) go(searchHref);
        }}
      >
        <label htmlFor={id} className="sr-only">
          Search jewellery
        </label>
        <input
          ref={input}
          id={id}
          name="q"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 && options[active] ? options[active].id : undefined}
          placeholder="Search jewellery…"
          autoComplete="off"
          enterKeyHint="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-11 min-w-0 flex-1 rounded-none border border-r-0 border-ink/30 bg-paper px-3 text-body-sm text-ink placeholder:text-ink/50 focus:border-ink [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex size-11 shrink-0 items-center justify-center bg-ink text-ivory transition-opacity duration-300 hover:opacity-90"
        >
          <Icon icon={Search} size={18} />
        </button>
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label={typing ? "Search suggestions" : "Popular searches"}
        className={cn(
          "absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto border border-mist bg-paper py-2 shadow-[0_18px_30px_-18px_rgb(49_24_41/0.3)] transition-opacity duration-200 lg:min-w-[26rem]",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        {!typing ? (
          <div role="group" aria-label="Popular searches" className="px-4 py-2">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-ink/70 uppercase">Popular</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map((chip, i) => {
                return (
                  <div
                    key={chip.href}
                    id={options[i]?.id}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(chip.href)}
                    className={cn(
                      "flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-caption text-ink transition-colors duration-200",
                      i === active ? "border-ink bg-ivory" : "border-mist hover:border-ink",
                    )}
                  >
                    {chip.label}
                  </div>
                );
              })}
            </div>
          </div>
        ) : loading && !data ? (
          <p className="px-4 py-3 text-body-sm text-ink/70">Searching…</p>
        ) : data && (data.products.length || data.links.length) ? (
          <>
            {data.products.length ? (
              <div role="group" aria-label="Pieces">
                {data.products.map((product, i) => {
                  return (
                    <div
                      key={product.slug}
                      id={options[i].id}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(options[i].href)}
                      className={cn(optionClass(i), "py-2")}
                    >
                      <span className="relative h-[60px] w-12 shrink-0 overflow-hidden bg-ivory">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            sizes="48px"
                            placeholder="blur"
                            blurDataURL={IVORY_BLUR}
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-ink">{product.name}</span>
                        <Price amount={product.price} className="text-caption text-ink/70" />
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {data.links.length ? (
              <div role="group" aria-label="Categories and styles" className="mt-1 border-t border-mist pt-1">
                {data.links.map((link, n) => {
                  const i = data.products.length + n;
                  return (
                    <div
                      key={link.href}
                      id={options[i].id}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(link.href)}
                      className={cn(optionClass(i), "min-h-11 text-body-sm text-ink")}
                    >
                      <Icon icon={Search} size={14} className="text-ink/50" />
                      {link.label}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {data.total ? (
              (() => {
                const i = data.products.length + data.links.length;
                return (
                  <div
                    id={options[i].id}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(searchHref)}
                    className={cn(optionClass(i), "mt-1 min-h-11 border-t border-mist text-caption text-ink underline underline-offset-4")}
                  >
                    View all {data.total} {data.total === 1 ? "piece" : "pieces"}
                  </div>
                );
              })()
            ) : null}
          </>
        ) : (
          <p className="px-4 py-3 text-body-sm text-ink/70">No pieces found. Press Enter to search anyway.</p>
        )}
      </div>
    </div>
  );
}
