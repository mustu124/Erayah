import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { PageEditor } from "./PageEditor";

export const metadata: Metadata = { title: "Edit page" };

const SLUGS = ["about", "shipping-returns", "privacy-policy", "terms"] as const;
type Img = { path: string; alt: string; role: "hero" | "founder" | "story" };

export default async function EditContentPage({ params }: PageProps<"/admin/content/pages/[slug]">) {
  await requireAdminPage("owner");
  const { slug } = await params;
  if (!(SLUGS as readonly string[]).includes(slug)) notFound();
  const { data } = await createAdminClient().from("pages").select("slug, title, body, seo_title, seo_description, images").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const images = (Array.isArray(data.images) ? data.images : []) as Img[];

  return (
    <>
      <Link href="/admin/content?tab=pages" className="mb-3 inline-flex min-h-9 items-center text-body-sm text-ink/70 hover:text-ink">
        ← Pages
      </Link>
      <PageHeader title={data.title} description={`erayah.com/${slug}`} />
      <PageEditor
        page={{
          slug: slug as (typeof SLUGS)[number],
          title: data.title,
          body: data.body,
          seoTitle: data.seo_title ?? "",
          seoDescription: data.seo_description ?? "",
          images,
        }}
      />
    </>
  );
}
