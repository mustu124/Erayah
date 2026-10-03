import type { Metadata } from "next";
import { Suspense } from "react";

import { getBestSellers, getHeroSlides, getNewArrivals } from "@/lib/data/catalog";
import { routes } from "@/lib/routes";

import { BrandStory } from "./_components/BrandStory";
import { Hero } from "./_components/Hero";
import { CarouselSkeleton, CategorySkeleton, HeroSkeleton } from "./_components/HomeSkeletons";
import { ProductCarouselSection } from "./_components/ProductCarouselSection";
import { ShopByCategory } from "./_components/ShopByCategory";

export const metadata: Metadata = {
  title: { absolute: "Erayah — Heirlooms, Reimagined" },
  description:
    "Handcrafted 22kt gold-plated jewellery in kundan, jadau and polki: earrings, necklace sets, rings and pendants, made to be handed down.",
};

// Homepage sections, strictly in this order: Hero, Shop by Category,
// New Arrivals, Best Sellers, Brand Story (the footer comes from the layout).
export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Erayah: handcrafted heirloom jewellery</h1>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<CategorySkeleton />}>
        <ShopByCategory />
      </Suspense>
      <Suspense fallback={<CarouselSkeleton tone="ivory" />}>
        <NewArrivals />
      </Suspense>
      <Suspense fallback={<CarouselSkeleton />}>
        <BestSellers />
      </Suspense>
      <BrandStory />
    </>
  );
}

async function HeroSection() {
  return <Hero slides={await getHeroSlides()} />;
}

async function NewArrivals() {
  return (
    <ProductCarouselSection
      id="new-arrivals"
      title="New Arrivals"
      products={await getNewArrivals()}
      href={routes.newArrivals}
      linkLabel="Shop All New Arrivals"
      tone="ivory"
    />
  );
}

async function BestSellers() {
  return (
    <ProductCarouselSection
      id="best-sellers"
      title="Best Sellers"
      products={await getBestSellers()}
      href={routes.bestSellers}
      linkLabel="Shop All Best Sellers"
    />
  );
}
