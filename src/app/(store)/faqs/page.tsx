import type { Metadata } from "next";
import Link from "next/link";

import { markdownToText, Prose } from "@/components/content/Prose";
import { Accordion } from "@/components/ui/Accordion";
import { getContactDetails, getFaqGroups } from "@/lib/data/content";
import { routes } from "@/lib/routes";
import { jsonLdScript } from "@/lib/seo/jsonld";
import { whatsappUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Orders and payment, shipping, returns, care, gifting and sizing: answers to common questions about Erayah jewellery.",
  alternates: { canonical: routes.faqs },
};

const anchor = (group: string) => group.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default async function FaqsPage() {
  const [groups, contact] = await Promise.all([getFaqGroups(), getContactDetails()]);
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) =>
      g.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: markdownToText(f.answer) } })),
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-14 pb-24 lg:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage) }} />
      <header className="text-center">
        <p className="text-[11px] font-medium tracking-[0.18em] text-gold uppercase">Help</p>
        <h1 className="mt-4 font-heading text-[36px] leading-[1.15] text-ink lg:text-[52px]">Frequently asked questions</h1>
      </header>

      {groups.length > 1 ? (
        <nav aria-label="Topics" className="mt-10 flex flex-wrap justify-center gap-2">
          {groups.map((g) => (
            <a key={g.group} href={`#${anchor(g.group)}`} className="inline-flex min-h-11 items-center rounded-full border border-mist px-4 text-body-sm text-ink transition-colors duration-300 hover:border-ink/50">
              {g.group}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="mt-12 space-y-14">
        {groups.map((g) => (
          <section key={g.group} id={anchor(g.group)} aria-labelledby={`${anchor(g.group)}-title`} className="scroll-mt-28">
            <h2 id={`${anchor(g.group)}-title`} className="border-b border-gold pb-3 font-heading text-h2 text-ink">
              {g.group}
            </h2>
            <div>
              {g.faqs.map((f) => (
                <Accordion key={f.id} size="md" title={<span className="normal-case tracking-normal text-body font-normal">{f.question}</span>}>
                  <Prose className="pr-8">{f.answer}</Prose>
                </Accordion>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-16 text-center text-body text-ink/75">
        Still wondering?{" "}
        <a href={whatsappUrl(contact.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
          Message us on WhatsApp
        </a>{" "}
        or{" "}
        <Link href={routes.contact} className="text-ink underline decoration-ink/35 underline-offset-4 hover:decoration-ink">
          write to us
        </Link>
        .
      </p>
    </div>
  );
}
