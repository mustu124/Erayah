import { MarkdownPage, markdownPageMetadata } from "@/components/content/MarkdownPage";
import { routes } from "@/lib/routes";

export const generateMetadata = () => markdownPageMetadata("privacy-policy", routes.privacyPolicy, "Privacy Policy");

export default function PrivacyPolicyPage() {
  return <MarkdownPage slug="privacy-policy" />;
}
