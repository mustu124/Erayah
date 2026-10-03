import type { ProductDetail } from "@/lib/data/product";

/** schema.org Product for a product page (price in INR, availability, brand Erayah). */
export function productJsonLd(product: ProductDetail, url: string) {
  const inStock = product.variants.length ? product.variants.some((v) => v.stockQty > 0) : product.stockQty > 0;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.shortDescription ?? undefined,
    sku: product.slug,
    url,
    image: product.gallery.filter((g) => g.role !== "video").map((g) => g.url),
    brand: { "@type": "Brand", name: "Erayah" },
    category: product.category?.name,
    material: product.materials.join(", "),
    offers: product.price
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "INR",
          price: (product.price / 100).toFixed(2),
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        }
      : undefined,
  };
}
