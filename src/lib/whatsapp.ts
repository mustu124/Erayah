/**
 * wa.me link with a prefilled message. `number` is digits only, with country
 * code. With a product: "Hi Erayah, I'm interested in the <name> (<url>)."
 * With an order number: "Hi Erayah, about my order <number>: ".
 */
export function whatsappUrl(
  number: string,
  about?: { name: string; url: string } | { orderNumber: string } | null,
): string {
  const message = !about
    ? "Hi Erayah, I have a question about "
    : "orderNumber" in about
      ? `Hi Erayah, about my order ${about.orderNumber}: `
      : `Hi Erayah, I'm interested in the ${about.name} (${about.url}).`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
