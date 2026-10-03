import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LISTS } from "@/lib/collection/scopes";
import { getCategories, resolveShopScope } from "@/lib/data/collection";

import { CollectionView, shopCrumbs } from "../_components/CollectionView";

/** Categories (/shop/earrings) and curated lists (/shop/new-arrivals). */
export async function generateStaticParams() {
  const categories = await getCategories();
  return [...categories.map((c) => ({ slug: c.slug })), ...Object.keys(LISTS).map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const scope = await resolveShopScope(slug);
  if (!scope) return {};
  return {
    title: scope.seoTitle,
    description: scope.seoDescription,
    alternates: { canonical: scope.path },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const scope = await resolveShopScope(slug);
  if (!scope) notFound();
  return <CollectionView scope={scope} crumbs={shopCrumbs(scope)} searchParams={searchParams} />;
}
