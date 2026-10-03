import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/product/Gallery";
import { Marquee } from "@/components/product/Marquee";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { Accordion } from "@/components/ui/Accordion";
import { Carousel } from "@/components/ui/Carousel";
import { Price } from "@/components/ui/Price";
import { publicEnv } from "@/lib/env/public";
import { getAllProductSlugs, getCompleteTheLook, getProduct } from "@/lib/data/product";
import { getSiteShell } from "@/lib/data/site";
import { routes } from "@/lib/routes";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/seo/jsonld";
import { productJsonLd } from "@/lib/seo/product-jsonld";

const DEFAULT_CARE =
  "Store each piece separately in its pouch, away from moisture. Keep away from perfume, water, lotions and sweat; put jewellery on last and take it off first. Wipe gently with a soft dry cloth after wear. Avoid wearing while bathing, swimming or exercising.";

const absolute = (path: string) => `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${path}`;

export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  const description =
    product.seoDescription ?? product.shortDescription ?? product.description ?? `${product.name}, handcrafted by Erayah.`;
  return {
    title: product.seoTitle ?? product.name,
    description,
    alternates: { canonical: routes.product(product.slug) },
    // The Open Graph image (worn close-up as JPEG) comes from opengraph-image.tsx.
    openGraph: { title: `${product.name} · Erayah`, description, url: routes.product(product.slug), type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const [look, shell] = await Promise.all([
    getCompleteTheLook({ id: product.id, slug: product.slug, price: product.price, categoryId: product.category?.id ?? null }),
    getSiteShell(),
  ]);
  const url = absolute(routes.product(product.slug));
  const crumbs = [
    { name: "Home", path: routes.home },
    ...(product.category ? [{ name: product.category.name, path: routes.collection(product.category.slug) }] : []),
    { name: product.name, path: routes.product(product.slug) },
  ];
  const catalogueLine = [
    product.stones.length ? `Stones: ${product.stones.join(", ")}` : null,
    product.closure ? `Closure: ${product.closure}` : null,
    product.chainLength ? `Chain: ${product.chainLength}` : null,
  ].filter(Boolean);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, url)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />

      <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-[55fr_45fr] lg:gap-14 lg:px-10 lg:pt-10">
        <Gallery items={product.gallery} name={product.name} />

        <div className="px-4 pt-6 md:px-6 lg:sticky lg:top-24 lg:self-start lg:px-0 lg:pt-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap gap-1 text-[11px] text-ink/60">
              {crumbs.map((crumb, i) => (
                <li key={crumb.path} className="flex items-center gap-1">
                  {i < crumbs.length - 1 ? (
                    <>
                      <Link href={crumb.path} className="hover:text-ink">
                        {crumb.name}
                      </Link>
                      <span aria-hidden="true">/</span>
                    </>
                  ) : (
                    <span aria-current="page" className="text-ink/80">
                      {crumb.name}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <h1 className="mt-3 font-heading text-[24px] leading-tight text-ink lg:text-[28px]">{product.name}</h1>
          <p className="mt-2">
            <Price amount={product.price} className="text-body-lg text-ink" />
          </p>
          <p className="text-[11px] text-ink/60">Inclusive of all taxes</p>

          <ProductPurchase
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              stockQty: product.stockQty,
              variants: product.variants,
            }}
            url={url}
            whatsappNumber={shell.whatsappNumber}
          />

          <div className="mt-10 border-t border-mist">
            <Accordion title="Description" size="md" defaultOpen>
              <div className="space-y-3 text-body text-ink/85">
                {product.description ? <p>{product.description}</p> : null}
                {product.shortDescription ? <p className="text-body-sm text-ink/70">{product.shortDescription}</p> : null}
                {catalogueLine.length ? (
                  <ul className="space-y-0.5 text-body-sm text-ink/70">
                    {catalogueLine.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Accordion>
            <Accordion title="Material & Craft" size="md">
              <p className="text-body-sm text-ink/80">
                {[...product.materials, ...product.stones.map((s) => s.charAt(0).toUpperCase() + s.slice(1))].join(" · ")}
              </p>
            </Accordion>
            <Accordion title="Care Instructions" size="md">
              <p className="text-body-sm text-ink/80">{product.careOverride ?? DEFAULT_CARE}</p>
            </Accordion>
            <Accordion title="Shipping & Returns" size="md">
              <div className="space-y-3 text-body-sm text-ink/80">
                <p>Orders are delivered within 7–10 working days. Express shipping on request can be arranged.</p>
                <p>
                  Returns and exchanges are accepted only for products damaged in transit or incorrect products received.
                  Items must be returned unworn and in their original packaging. Return shipping is paid by the customer.
                </p>
                <Link href={routes.shippingReturns} className="inline-flex min-h-11 items-center text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
                  Read our Shipping & Returns policy
                </Link>
              </div>
            </Accordion>
          </div>

          <p className="mt-6 font-script text-body-lg text-ink/80 italic">
            Each piece is handcrafted by traditional artisans; slight variations in stones and finish are natural and make it
            yours alone.
          </p>
        </div>
      </div>

      {look.length ? (
        <section aria-labelledby="complete-the-look" className="mt-16 lg:mt-24">
          <h2 id="complete-the-look" className="sr-only">
            Complete the Look
          </h2>
          <Marquee text="Complete the Look" />
          <div className="mx-auto max-w-[1440px] px-4 pt-10 md:px-6 lg:px-10 lg:pt-14">
            <Carousel label="Complete the Look" slideClassName="basis-[62%] md:basis-1/3 lg:basis-1/4">
              {look.map((p) => (
                <ProductCard key={p.id} product={p} sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 60vw" />
              ))}
            </Carousel>
          </div>
        </section>
      ) : null}

      <RecentlyViewed currentSlug={product.slug} />
    </>
  );
}
