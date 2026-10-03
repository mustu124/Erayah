"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChipSelect, MarkdownField, ProductPicker, TagInput } from "@/components/admin/fields";
import { DragHandle, Sortable } from "@/components/admin/Sortable";
import { useAdminAction } from "@/components/admin/use-action";
import { inputCls, Labeled, Panel, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { archiveProduct, deleteProduct, duplicateProduct, saveProduct } from "@/lib/admin/actions/products";
import type { EditableProduct } from "@/lib/admin/products";
import { slugify } from "@/lib/admin/slug";
import { COLOURS, STYLES } from "@/lib/collection/params";

type Props = {
  product: EditableProduct;
  categories: { id: number; name: string }[];
  ordered: boolean;
  missingPhotos: number;
};

let nextKey = 0;
type VariantRow = EditableProduct["variants"][number] & { key: number };

export function ProductEditor({ product, categories, ordered, missingPhotos }: Props) {
  const router = useRouter();
  const [p, setP] = useState(product);
  const [price, setPrice] = useState(product.price === null ? "" : String(product.price / 100));
  const [slugTouched, setSlugTouched] = useState(Boolean(product.id));
  const [variants, setVariants] = useState<VariantRow[]>(product.variants.map((v) => ({ ...v, key: nextKey++ })));
  const save = useAdminAction(saveProduct);
  const dup = useAdminAction(duplicateProduct);
  const archive = useAdminAction(archiveProduct);
  const del = useAdminAction(deleteProduct);
  const err = save.fields;

  const set = <K extends keyof EditableProduct>(key: K, value: EditableProduct[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof EditableProduct) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await save.run({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryId: p.categoryId ?? 0,
      price: price.trim() === "" ? null : (price.replace(/[₹,\s]/g, "") as unknown as number),
      shortDescription: p.shortDescription,
      description: p.description,
      materials: p.materials,
      stones: p.stones,
      colours: p.colours as never,
      styles: p.styles as never,
      closure: p.closure,
      chainLength: p.chainLength,
      careOverride: p.careOverride,
      stockQty: p.stockQty,
      isPublished: p.isPublished,
      isNewArrival: p.isNewArrival,
      isBestSeller: p.isBestSeller,
      isGiftForHer: p.isGiftForHer,
      isHero: p.isHero,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      variants: variants.map(({ id, label, colour, stockQty }) => ({ id, label, colour: colour as never, stockQty })),
      completeTheLook: p.completeTheLook.map((r) => r.id),
      crossSell: p.crossSell.map((r) => r.id),
    });
    if (result.ok && !p.id && result.data) router.replace(`/admin/products/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Panel title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Name" htmlFor="name" error={err.name} className="sm:col-span-2">
            <TextInput
              id="name"
              value={p.name}
              maxLength={120}
              aria-invalid={Boolean(err.name)}
              onChange={(e) => {
                const name = e.target.value;
                setP((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
              }}
            />
          </Labeled>
          <Labeled label="Web address (slug)" htmlFor="slug" error={err.slug} hint={`erayah.com/product/${p.slug || "…"}`}>
            <TextInput
              id="slug"
              value={p.slug}
              maxLength={80}
              aria-invalid={Boolean(err.slug)}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
            />
          </Labeled>
          <Labeled label="Category" htmlFor="category" error={err.categoryId}>
            <select id="category" value={p.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)} className={inputCls} aria-invalid={Boolean(err.categoryId)}>
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Price (₹, including GST)" htmlFor="price" error={err.price}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink/60">₹</span>
              <TextInput id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="pl-7" aria-invalid={Boolean(err.price)} placeholder="2350" />
            </div>
          </Labeled>
          {variants.length ? (
            <p className="self-end pb-3 text-body-sm text-ink/65">Stock is set per option below.</p>
          ) : (
            <Labeled label="Stock" htmlFor="stock" error={err.stockQty}>
              <TextInput id="stock" type="number" min={0} inputMode="numeric" value={p.stockQty} onChange={(e) => set("stockQty", Math.max(0, Number(e.target.value) || 0))} />
            </Labeled>
          )}
        </div>
        <div className="mt-4 grid gap-x-6 border-t border-mist pt-3 sm:grid-cols-2">
          <Toggle checked={p.isPublished} onChange={(v) => set("isPublished", v)} label={p.isPublished ? "Published: shown in the shop" : "Draft: hidden from the shop"} />
          <Toggle checked={p.isNewArrival} onChange={(v) => set("isNewArrival", v)} label="New Arrival" />
          <Toggle checked={p.isBestSeller} onChange={(v) => set("isBestSeller", v)} label="Best Seller" />
          <Toggle checked={p.isGiftForHer} onChange={(v) => set("isGiftForHer", v)} label="Gifts for Her" />
          <Toggle checked={p.isHero} onChange={(v) => set("isHero", v)} label="Hero piece (a signature piece)" />
        </div>
        {p.isPublished && missingPhotos ? (
          <p className="mt-3 text-body-sm text-plum">Published without all 4 photos. See Photos below.</p>
        ) : null}
      </Panel>

      <Panel title="Description">
        <div className="space-y-4">
          <Labeled label="Short description" htmlFor="short" error={err.shortDescription} hint="One or two sentences. Shown under the price and in search results.">
            <TextArea id="short" rows={2} maxLength={300} value={p.shortDescription} onChange={text("shortDescription")} />
          </Labeled>
          <Labeled label="Description" htmlFor="description" error={err.description}>
            <MarkdownField id="description" value={p.description} onChange={(v) => set("description", v)} />
          </Labeled>
        </div>
      </Panel>

      <Panel title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Materials" htmlFor="materials" hint="Press Enter after each one.">
            <TagInput id="materials" value={p.materials} onChange={(v) => set("materials", v)} placeholder="22kt gold-plated silver alloy" />
          </Labeled>
          <Labeled label="Stones" htmlFor="stones" hint="Press Enter after each one.">
            <TagInput id="stones" value={p.stones} onChange={(v) => set("stones", v)} placeholder="Polki, pearl" />
          </Labeled>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-body-sm text-ink">Colours (for the colour filter)</p>
            <ChipSelect label="Colours" options={COLOURS} value={p.colours} onChange={(v) => set("colours", v)} />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-body-sm text-ink">Styles (for style pages and filters)</p>
            <ChipSelect label="Styles" options={STYLES} value={p.styles} onChange={(v) => set("styles", v)} />
          </div>
          <Labeled label="Closure" htmlFor="closure">
            <TextInput id="closure" maxLength={120} value={p.closure} onChange={text("closure")} placeholder="Push-back" />
          </Labeled>
          <Labeled label="Chain length" htmlFor="chain">
            <TextInput id="chain" maxLength={120} value={p.chainLength} onChange={text("chainLength")} placeholder="Adjustable, 16–18 in" />
          </Labeled>
          <Labeled label="Care instructions (only if different from the usual)" htmlFor="care" className="sm:col-span-2" hint="Leave empty to show the standard care text.">
            <TextArea id="care" rows={3} maxLength={1500} value={p.careOverride} onChange={text("careOverride")} />
          </Labeled>
        </div>
      </Panel>

      <Panel
        title="Options (e.g. colours sold under one product)"
        actions={
          <button
            type="button"
            onClick={() => setVariants([...variants, { id: null, label: "", colour: null, stockQty: 0, key: nextKey++ }])}
            className="inline-flex min-h-9 items-center gap-1 text-body-sm underline decoration-ink/30 underline-offset-4"
          >
            <Icon icon={Plus} size={14} /> Add option
          </button>
        }
      >
        {variants.length ? (
          <Sortable items={variants} getId={(v) => v.key} onReorder={setVariants} className="space-y-2">
            {(v, handle, i) => (
              <div className="flex flex-wrap items-center gap-2 border border-mist bg-paper p-2">
                <DragHandle handle={handle} label={`Move option ${v.label || i + 1}`} />
                <label className="sr-only" htmlFor={`variant-${v.key}`}>
                  Option name
                </label>
                <TextInput
                  id={`variant-${v.key}`}
                  value={v.label}
                  maxLength={40}
                  placeholder="e.g. Pink"
                  onChange={(e) => setVariants(variants.map((x) => (x.key === v.key ? { ...x, label: e.target.value } : x)))}
                  className="w-36 flex-1"
                />
                <label className="sr-only" htmlFor={`variant-colour-${v.key}`}>
                  Colour
                </label>
                <select
                  id={`variant-colour-${v.key}`}
                  value={v.colour ?? ""}
                  onChange={(e) => setVariants(variants.map((x) => (x.key === v.key ? { ...x, colour: e.target.value || null } : x)))}
                  className={`${inputCls} w-36`}
                >
                  <option value="">No colour</option>
                  {COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={`variant-stock-${v.key}`}>
                  Stock
                </label>
                <TextInput
                  id={`variant-stock-${v.key}`}
                  type="number"
                  min={0}
                  value={v.stockQty}
                  onChange={(e) => setVariants(variants.map((x) => (x.key === v.key ? { ...x, stockQty: Math.max(0, Number(e.target.value) || 0) } : x)))}
                  className="w-24"
                  aria-label="Stock"
                />
                <button type="button" aria-label={`Remove option ${v.label}`} onClick={() => setVariants(variants.filter((x) => x.key !== v.key))} className="flex size-11 items-center justify-center rounded-xs hover:bg-ivory">
                  <Icon icon={X} size={16} />
                </button>
              </div>
            )}
          </Sortable>
        ) : (
          <p className="text-body-sm text-ink/60">No options. Each colour is usually its own product; use options only for one piece sold in several versions.</p>
        )}
        {err.variants ? <p className="mt-2 text-caption text-plum">{err.variants}</p> : null}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Complete the Look">
          <ProductPicker label="Add to Complete the Look" value={p.completeTheLook} onChange={(v) => set("completeTheLook", v)} excludeId={p.id} />
          <p className="mt-2 text-caption text-ink/55">Shown under the product. With fewer than 3, similar pieces fill in.</p>
        </Panel>
        <Panel title="Cross-sell (cart suggestions)">
          <ProductPicker label="Add a cart suggestion" value={p.crossSell} onChange={(v) => set("crossSell", v)} excludeId={p.id} />
        </Panel>
      </div>

      <Panel title="Search engines (optional)">
        <div className="grid gap-4">
          <Labeled label={`SEO title (${p.seoTitle.length}/70)`} htmlFor="seo-title" hint="Leave empty to use the product name.">
            <TextInput id="seo-title" maxLength={70} value={p.seoTitle} onChange={text("seoTitle")} />
          </Labeled>
          <Labeled label={`SEO description (${p.seoDescription.length}/170)`} htmlFor="seo-description" hint="Leave empty to use the short description.">
            <TextArea id="seo-description" rows={2} maxLength={170} value={p.seoDescription} onChange={text("seoDescription")} />
          </Labeled>
        </div>
      </Panel>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-mist bg-paper-warm/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <Button type="submit" disabled={save.pending}>
          {save.pending ? "Saving…" : p.id ? "Save product" : "Create product"}
        </Button>
        {p.id ? (
          <>
            <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("link", "px-3")}>
              View in shop ↗
            </a>
            <span className="flex-1" />
            <Button
              variant="outline"
              className="px-4"
              disabled={dup.pending}
              onClick={async () => {
                const r = await dup.run({ id: p.id! });
                if (r.ok && r.data) router.push(`/admin/products/${r.data.id}`);
              }}
            >
              Duplicate
            </Button>
            {product.isPublished ? (
              <Button variant="outline" className="px-4" disabled={archive.pending} onClick={() => window.confirm("Hide this piece from the shop?") && archive.run({ id: p.id! })}>
                Archive
              </Button>
            ) : null}
            {ordered ? null : (
              <Button
                variant="link"
                className="px-3 text-plum"
                disabled={del.pending}
                onClick={async () => {
                  if (!window.confirm(`Delete “${product.name}” and its photos for good?`)) return;
                  if ((await del.run({ id: p.id! })).ok) router.replace("/admin/products");
                }}
              >
                Delete
              </Button>
            )}
          </>
        ) : null}
      </div>
    </form>
  );
}
