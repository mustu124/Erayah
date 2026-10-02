import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format/price";

type PriceProps = {
  /** Amount in paise. */
  amount: number | null;
  className?: string;
};

/** ₹2,350. Renders nothing for a product without a price. */
export function Price({ amount, className }: PriceProps) {
  if (amount === null) return null;
  return <span className={cn("tabular-nums", className)}>{formatPrice(amount)}</span>;
}
