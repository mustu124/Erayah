/**
 * wa.me link with a prefilled message. `number` is digits only, with country
 * code. With a product: "Hi Erayah, I'm interested in the <name> (<url>)."
 */
export function whatsappUrl(number: string, product?: { name: string; url: string } | null): string {
  const message = product
    ? `Hi Erayah, I'm interested in the ${product.name} (${product.url}).`
    : "Hi Erayah, I have a question about ";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
