import type { Metadata } from "next";

import { shopAllScope } from "@/lib/collection/scopes";

import { CollectionView, shopCrumbs } from "./_components/CollectionView";

const scope = shopAllScope();

export const metadata: Metadata = {
  title: scope.seoTitle,
  description: scope.seoDescription,
  alternates: { canonical: scope.path },
};

export default function ShopAllPage({ searchParams }: PageProps<"/shop">) {
  return <CollectionView scope={scope} crumbs={shopCrumbs(scope)} searchParams={searchParams} />;
}
