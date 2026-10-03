import { MarkdownPage, markdownPageMetadata } from "@/components/content/MarkdownPage";
import { routes } from "@/lib/routes";

export const generateMetadata = () => markdownPageMetadata("shipping-returns", routes.shippingReturns, "Shipping & Returns");

export default function ShippingReturnsPage() {
  return <MarkdownPage slug="shipping-returns" />;
}
