const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats an amount in paise as Indian rupees: 235000 → "₹2,350". */
export function formatPrice(paise: number): string {
  return rupees.format(paise / 100);
}
