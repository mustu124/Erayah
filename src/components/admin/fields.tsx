"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Icon } from "@/components/ui/Icon";
import { searchProductsForPicker } from "@/lib/admin/actions/products";
import { cn } from "@/lib/cn";

import { DragHandle, Sortable } from "./Sortable";
import { inputCls, textareaCls } from "./ui";

/** Free-text tags (materials, stones): type and press Enter or comma. */
export function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim().replace(/,$/, "");
    if (tag && !value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xs border border-mist bg-paper px-2 py-1.5 focus-within:border-ink">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-ivory py-0.5 pr-1 pl-2.5 text-body-sm">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((v) => v !== tag))} className="flex size-6 items-center justify-center rounded-full hover:bg-mist">
            <Icon icon={X} size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => (e.target.value.endsWith(",") ? (setDraft(e.target.value), setTimeout(add)) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 text-body outline-none"
      />
    </div>
  );
}

/** Pick any number from a fixed list (colours, styles). */
export function ChipSelect({ options, value, onChange, label }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={cn("min-h-9 rounded-full border px-3 text-body-sm capitalize transition-colors duration-200", on ? "border-ink bg-ink text-ivory" : "border-mist bg-paper text-ink hover:border-ink/40")}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Markdown with a Write / Preview switch. */
export function MarkdownField({ id, value, onChange, rows = 8, placeholder }: { id: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex gap-1" role="tablist" aria-label="Editor mode">
        {["Write", "Preview"].map((mode, i) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={preview === (i === 1)}
            onClick={() => setPreview(i === 1)}
            className={cn("min-h-9 rounded-xs px-3 text-caption", preview === (i === 1) ? "bg-ink text-ivory" : "text-ink/70 hover:bg-ivory")}
          >
            {mode}
          </button>
        ))}
        <span className="ml-auto self-center text-caption text-ink/50">**bold**, *italic*, ## heading, - list, [link](https://…)</span>
      </div>
      {preview ? (
        <div className="prose-admin min-h-32 rounded-xs border border-mist bg-paper px-4 py-3 text-body text-ink">
          {value.trim() ? <ReactMarkdown>{value}</ReactMarkdown> : <p className="text-ink/50">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(textareaCls, "font-mono text-body-sm leading-relaxed")} />
      )}
    </div>
  );
}

export type Pick = { id: number; name: string; thumb: string | null };

/** Search products, add them, drag to order. */
export function ProductPicker({ value, onChange, excludeId, max = 8, label }: { value: Pick[]; onChange: (v: Pick[]) => void; excludeId: number | null; max?: number; label: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<(Pick & { published: boolean })[]>([]);
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(() => {
      searchProductsForPicker(q, excludeId).then((r) => live && setResults(r));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, open, excludeId]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const chosen = new Set(value.map((v) => v.id));
  return (
    <div>
      {value.length ? (
        <Sortable items={value} getId={(p) => p.id} onReorder={onChange} className="mb-2 space-y-1.5">
          {(p, handle) => (
            <div className="flex items-center gap-2 border border-mist bg-paper py-1 pr-1 pl-1">
              <DragHandle handle={handle} label={`Move ${p.name}`} />
              <div className="relative size-9 shrink-0 overflow-hidden bg-ivory">{p.thumb ? <Image src={p.thumb} alt="" fill sizes="36px" className="object-cover" /> : null}</div>
              <span className="min-w-0 flex-1 truncate text-body-sm">{p.name}</span>
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((v) => v.id !== p.id))} className="flex size-9 items-center justify-center rounded-xs hover:bg-ivory">
                <Icon icon={X} size={14} />
              </button>
            </div>
          )}
        </Sortable>
      ) : null}
      {value.length < max ? (
        <div ref={box} className="relative">
          <label htmlFor={inputId} className="sr-only">
            {label}
          </label>
          <input id={inputId} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} placeholder="Search products to add" className={inputCls} autoComplete="off" />
          {open && results.length ? (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto border border-mist bg-paper shadow-sm">
              {results
                .filter((r) => !chosen.has(r.id))
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...value, { id: r.id, name: r.name, thumb: r.thumb }]);
                        setQ("");
                        setOpen(false);
                      }}
                      className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-body-sm hover:bg-ivory"
                    >
                      <span className="relative size-8 shrink-0 overflow-hidden bg-ivory">{r.thumb ? <Image src={r.thumb} alt="" fill sizes="32px" className="object-cover" /> : null}</span>
                      <span className="flex-1 truncate">{r.name}</span>
                      {r.published ? null : <span className="text-caption text-ink/50">draft</span>}
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-caption text-ink/55">Up to {max} pieces.</p>
      )}
    </div>
  );
}
