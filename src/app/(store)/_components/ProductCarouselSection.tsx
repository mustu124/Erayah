import { ProductCard } from "@/components/product/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { Carousel } from "@/components/ui/Carousel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/cn";
import type { ProductCardData } from "@/lib/data/catalog";
import { currentMonthLabel } from "@/lib/format/date";

type ProductCarouselSectionProps = {
  id: string;
  title: string;
  products: ProductCardData[];
  href: string;
  linkLabel: string;
  tone?: "ivory" | "plain";
};

/** 5 cards on desktop, 1.6 on mobile (a peek of the next), arrows over the images, dots, then "Shop All …". */
export const CAROUSEL_SLIDE = "basis-[62%] md:basis-1/3 lg:basis-1/5";
const CARD_SIZES = "(min-width: 1024px) 19vw, (min-width: 768px) 31vw, 60vw";

export async function ProductCarouselSection({ id, title, products, href, linkLabel, tone = "plain" }: ProductCarouselSectionProps) {
  if (!products.length) return null;
  const month = await currentMonthLabel();

  return (
    <section aria-labelledby={id} className={cn("py-14 lg:py-20", tone === "ivory" && "bg-ivory")}>
      <div className="mx-auto max-w-[1440px] px-4 md:px-6 lg:px-10">
        <SectionHeader id={id} title={title} label={month} />
        <Carousel label={title} slideClassName={CAROUSEL_SLIDE} arrowTopClassName="top-[39%]" className="mt-8 lg:mt-10">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} sizes={CARD_SIZES} />
          ))}
        </Carousel>
        <div className="mt-4 flex justify-center">
          <ButtonLink href={href} variant="link">
            {linkLabel}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
