import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { EMPTY_PRODUCT, getEditableProduct, listCategories, REQUIRED_ROLES } from "@/lib/admin/products";

import { ProductEditor } from "./ProductEditor";
import { ProductImages } from "./ProductImages";

export const metadata: Metadata = { title: "Product" };

export default async function ProductEditPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const categories = await listCategories();

  if (id === "new") {
    return (
      <>
        <Link href="/admin/products" className="mb-3 inline-flex min-h-9 items-center text-body-sm text-ink/70 hover:text-ink">
          ← Products
        </Link>
        <PageHeader title="New product" description="Save it first, then add its photos." />
        <ProductEditor product={EMPTY_PRODUCT} categories={categories} ordered={false} missingPhotos={0} />
      </>
    );
  }

  if (!/^\d+$/.test(id)) notFound();
  const loaded = await getEditableProduct(Number(id));
  if (!loaded) notFound();
  const { product, images, ordered } = loaded;
  const roles = new Set(images.map((i) => i.role));
  const missing = REQUIRED_ROLES.filter((r) => !roles.has(r)).length;

  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex min-h-9 items-center text-body-sm text-ink/70 hover:text-ink">
        ← Products
      </Link>
      <PageHeader title={product.name} description={product.isPublished ? "Published" : "Draft (hidden from the shop)"} />
      <Panel title="Photos" className="mb-6">
        <ProductImages productId={product.id!} slug={product.slug} productName={product.name} published={product.isPublished} images={images} />
      </Panel>
      <ProductEditor key={product.id} product={product} categories={categories} ordered={ordered} missingPhotos={missing} />
    </>
  );
}
