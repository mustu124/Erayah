import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { STYLE_PAGES, styleScope } from "@/lib/collection/scopes";

import { CollectionView, shopCrumbs } from "../../_components/CollectionView";

/** Style pages: /shop/style/studs, /shop/style/jhumkas-chaandbaalis, … */
export function generateStaticParams() {
  return Object.keys(STYLE_PAGES).map((style) => ({ style }));
}

export async function generateMetadata({ params }: PageProps<"/shop/style/[style]">): Promise<Metadata> {
  const scope = styleScope((await params).style);
  if (!scope) return {};
  return {
    title: scope.seoTitle,
    description: scope.seoDescription,
    alternates: { canonical: scope.path },
  };
}

export default async function StylePage({ params, searchParams }: PageProps<"/shop/style/[style]">) {
  const scope = styleScope((await params).style);
  if (!scope) notFound();
  return <CollectionView scope={scope} crumbs={shopCrumbs(scope)} searchParams={searchParams} />;
}
