import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPage } from "@/lib/data/content";

import { Prose } from "./Prose";

export async function markdownPageMetadata(slug: string, path: string, fallback: string): Promise<Metadata> {
  const page = await getPage(slug);
  return {
    title: page?.seoTitle ?? page?.title ?? fallback,
    description: page?.seoDescription ?? undefined,
    alternates: { canonical: path },
  };
}

/** Shipping & Returns, Privacy Policy, Terms: a title and a narrow reading column of markdown from /admin. */
export async function MarkdownPage({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-[680px] px-4 pt-14 pb-24 lg:pt-20">
      <header className="mb-12 border-b border-gold pb-8 text-center">
        <h1 className="font-heading text-[34px] leading-[1.15] text-ink lg:text-[46px]">{page.title}</h1>
      </header>
      <Prose>{page.body}</Prose>
    </article>
  );
}
