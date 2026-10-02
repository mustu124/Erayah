/** wa.me link with a prefilled message. `number` is digits only, with country code. */
export function whatsappUrl(number: string, topic?: string | null): string {
  const message = topic
    ? `Hi Erayah, I have a question about the ${topic}.`
    : "Hi Erayah, I have a question about ";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
