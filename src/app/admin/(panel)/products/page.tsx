import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { EmptyState, inputCls, PageHeader, Panel, TableWrap, td, th } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireAdminPage } from "@/lib/admin/auth";
import { type AdminProductRow, listAdminProducts, listCategories } from "@/lib/admin/products";

import { InlineNumber } from "./InlineEdit";

export const metadata: Metadata = { title: "Products" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function Flags({ p }: { p: AdminProductRow }) {
  const flags = [p.flags.new && "New", p.flags.best && "Best Seller", p.flags.gift && "Gift", p.flags.hero && "Hero"].filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <span key={f} className="rounded-full bg-gold-light/70 px-2 py-0.5 text-[11px] whitespace-nowrap">
          {f}
        </span>
      ))}
    </div>
  );
}

function Thumb({ p }: { p: AdminProductRow }) {
  return <div className="relative size-12 shrink-0 overflow-hidden bg-ivory">{p.thumb ? <Image src={p.thumb} alt="" fill sizes="48px" className="object-cover" /> : null}</div>;
}

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdminPage();
  const params = await searchParams;
  const f = { q: one(params.q).trim().slice(0, 60), category: one(params.category), stock: one(params.stock) };
  const [products, categories] = await Promise.all([listAdminProducts(f), listCategories()]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Click a price or stock number to change it, then press Enter."
        actions={
          <Link href="/admin/products/new" className={buttonClasses("solid")}>
            New product
          </Link>
        }
      />

      <form method="get" className="mb-4 grid gap-3 border border-mist bg-paper p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div>
          <label htmlFor="q" className="mb-1 block text-caption text-ink/70">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Product name" className={inputCls} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-caption text-ink/70">
            Category
          </label>
          <select id="category" name="category" defaultValue={f.category} className={inputCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stock" className="mb-1 block text-caption text-ink/70">
            Stock
          </label>
          <select id="stock" name="stock" defaultValue={f.stock} className={inputCls}>
            <option value="">Any</option>
            <option value="low">Low (2 or fewer)</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClasses("solid", "px-5")}>
            Apply
          </button>
          <Link href="/admin/products" className={buttonClasses("link", "px-2")}>
            Clear
          </Link>
        </div>
      </form>

      <Panel title={`${products.length} ${products.length === 1 ? "product" : "products"}`}>
        {!products.length ? (
          <EmptyState>No products match.</EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-mist md:hidden">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <Thumb p={p} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${p.id}`} className="block truncate font-medium">
                      {p.name}
                    </Link>
                    <p className="text-caption text-ink/60">
                      {p.category} · {p.published ? "Published" : "Draft"}
                      {p.missingRoles.length && p.published ? <span className="text-plum"> · {p.missingRoles.length} photos missing</span> : null}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-body-sm">
                      <InlineNumber id={p.id} field="price" value={p.price} prefix="₹" label={`Price of ${p.name}`} />
                      {p.hasVariants ? (
                        <span className="text-caption text-ink/60">{p.stock} in stock</span>
                      ) : (
                        <>
                          <InlineNumber id={p.id} field="stockQty" value={p.stock} label={`Stock of ${p.name}`} />
                          <span className="text-caption text-ink/60">in stock</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <TableWrap>
              <table className="hidden w-full border-collapse md:table">
                <thead>
                  <tr>
                    <th className={th}>Product</th>
                    <th className={th}>Category</th>
                    <th className={`${th} text-right`}>Price</th>
                    <th className={`${th} text-right`}>Stock</th>
                    <th className={th}>Shop</th>
                    <th className={th}>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-ivory/50">
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <Thumb p={p} />
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                              {p.name}
                            </Link>
                            {p.missingRoles.length && p.published ? (
                              <p className="text-caption text-plum">
                                {p.missingRoles.length} of 4 photos missing
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={`${td} text-ink/75`}>{p.category}</td>
                      <td className={`${td} text-right`}>
                        <InlineNumber id={p.id} field="price" value={p.price} prefix="₹" label={`Price of ${p.name}`} />
                      </td>
                      <td className={`${td} text-right`}>
                        {p.hasVariants ? (
                          <Link href={`/admin/products/${p.id}`} className="text-body-sm tabular-nums underline decoration-ink/30 underline-offset-4" title="Stock is per option">
                            {p.stock}
                          </Link>
                        ) : (
                          <InlineNumber id={p.id} field="stockQty" value={p.stock} label={`Stock of ${p.name}`} />
                        )}
                      </td>
                      <td className={td}>
                        {p.published ? <span className="text-body-sm">Published</span> : <span className="text-body-sm text-ink/55">Draft</span>}
                      </td>
                      <td className={td}>
                        <Flags p={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </>
        )}
      </Panel>
      <p className="mt-3 text-caption text-ink/55">Prices include GST.</p>
    </>
  );
}
