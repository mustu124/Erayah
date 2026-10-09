import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { cn } from "@/lib/cn";
import { createAdminClient } from "@/lib/supabase/admin";

import { type Faq, FaqForm, FaqList, type Testimonial, TestimonialForm, TestimonialList } from "./ContentForms";

export const metadata: Metadata = { title: "Content" };

const TABS = [
  { value: "faqs", label: "FAQs" },
  { value: "testimonials", label: "Testimonials" },
  { value: "pages", label: "Pages" },
] as const;

const PAGE_HINTS: Record<string, string> = {
  about: "Your story, with a founder photo and story images.",
  "shipping-returns": "Delivery times and returns.",
  "privacy-policy": "How customer details are used. Needs legal review.",
  terms: "Terms & Conditions. Needs legal review.",
};

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  await requireAdminPage("owner");
  const raw = (await searchParams).tab;
  const tab = TABS.find((t) => t.value === raw)?.value ?? "faqs";
  const db = createAdminClient();

  let body: React.ReactNode;
  if (tab === "faqs") {
    const { data } = await db.from("faqs").select("*").order("sort_order");
    const faqs: Faq[] = (data ?? []).map((f) => ({ id: f.id, question: f.question, answer: f.answer, group: f.group_name ?? "", isActive: f.is_active }));
    const groups = [...new Set(faqs.map((f) => f.group).filter(Boolean))];
    body = (
      <div className="space-y-6">
        <Panel title={`${faqs.length} questions`}>
          {faqs.length ? <FaqList faqs={faqs} groups={groups} /> : <p className="text-body-sm text-ink/60">No FAQs yet.</p>}
          <p className="mt-3 text-caption text-ink/55">Tap a question to edit it. Drag by the grip to reorder.</p>
        </Panel>
        <Panel title="Add a question">
          <FaqForm groups={groups} />
        </Panel>
      </div>
    );
  } else if (tab === "testimonials") {
    const { data } = await db.from("testimonials").select("*").order("sort_order");
    const items: Testimonial[] = (data ?? []).map((t) => ({ id: t.id, quote: t.quote, authorName: t.author_name, location: t.location ?? "", isActive: t.is_active }));
    body = (
      <div className="space-y-6">
        <Panel title={`${items.length} testimonials`}>
          {items.length ? <TestimonialList items={items} /> : <p className="text-body-sm text-ink/60">No testimonials yet.</p>}
        </Panel>
        <Panel title="Add a testimonial">
          <TestimonialForm />
        </Panel>
      </div>
    );
  } else {
    const { data } = await db.from("pages").select("slug, title, updated_at").order("id");
    body = (
      <Panel>
        <ul className="divide-y divide-mist">
          {(data ?? []).map((p) => (
            <li key={p.slug}>
              <Link href={`/admin/content/pages/${p.slug}`} className="flex min-h-14 items-center justify-between gap-3 py-2 hover:bg-ivory/50">
                <span>
                  <span className="block font-medium">{p.title}</span>
                  <span className="text-caption text-ink/60">{PAGE_HINTS[p.slug] ?? `/${p.slug}`}</span>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader title="Content" description="Words on the site that aren't products." />
      <nav aria-label="Content sections" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/content?tab=${t.value}`}
            aria-current={t.value === tab ? "page" : undefined}
            className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-body-sm", t.value === tab ? "border-ink bg-ink text-ivory" : "border-mist bg-paper hover:border-ink/40")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
