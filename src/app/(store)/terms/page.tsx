import { MarkdownPage, markdownPageMetadata } from "@/components/content/MarkdownPage";
import { routes } from "@/lib/routes";

export const generateMetadata = () => markdownPageMetadata("terms", routes.terms, "Terms & Conditions");

export default function TermsPage() {
  return <MarkdownPage slug="terms" />;
}
