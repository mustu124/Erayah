import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { InstagramGlyph } from "@/components/ui/BrandIcons";
import { Prose } from "@/components/content/Prose";
import { TestimonialSlider } from "@/components/content/TestimonialSlider";
import { ButtonLink } from "@/components/ui/Button";
import { ElephantMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { getAboutFallbackImages, getContactDetails, getPage, getTestimonials, type PageImage } from "@/lib/data/content";
import { IVORY_BLUR } from "@/lib/images";
import { routes } from "@/lib/routes";

import { GiantWordmark } from "../_components/GiantWordmark";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return {
    title: page?.seoTitle ?? "About Erayah",
    description: page?.seoDescription ?? "Erayah means fortune's favourite. Handcrafted heirloom jewellery, made to be handed down.",
    alternates: { canonical: routes.about },
  };
}

type Section = { title: string; body: string; kind: "story" | "founder" | "craft" };

/** The About text is markdown; each "## Heading" starts a section (see the admin hint). */
function parseSections(body: string): { intro: string; sections: Section[] } {
  const [intro, ...rest] = body.split(/^##[ \t]+/m);
  return {
    intro: intro.trim(),
    sections: rest.map((chunk) => {
      const [title, ...lines] = chunk.split("\n");
      const kind = /founder/i.test(title) ? "founder" : /craft/i.test(title) ? "craft" : "story";
      return { title: title.trim(), body: lines.join("\n").trim(), kind };
    }),
  };
}

type Img = { url: string; alt: string; blurDataUrl?: string | null };

function Photo({ img, sizes, className, priority, position }: { img: Img | null; sizes: string; className?: string; priority?: boolean; position?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-ivory", className)}>
      {img ? (
        <Image
          src={img.url}
          alt={img.alt}
          fill
          sizes={sizes}
          preload={priority}
          className="object-cover"
          style={position ? { objectPosition: position } : undefined}
          placeholder="blur"
          blurDataURL={img.blurDataUrl ?? IVORY_BLUR}
        />
      ) : (
        <ElephantMark className="absolute top-1/2 left-1/2 h-16 w-auto -translate-x-1/2 -translate-y-1/2 text-gold/50" />
      )}
    </div>
  );
}

const Label = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="font-body text-[11px] font-medium tracking-[0.18em] text-gold uppercase">
    {children}
  </h2>
);

export default async function AboutPage() {
  const [page, fallback, contact] = await Promise.all([getPage("about"), getAboutFallbackImages(), getContactDetails()]);
  if (!page) notFound();
  const { intro, sections } = parseSections(page.body);
  const own = (role: PageImage["role"]) => page.images.filter((i) => i.role === role);
  const ownHero = own("hero")[0];
  const hero: Img | null = ownHero ?? fallback.hero;
  const storyImages: Img[] = own("story").length ? own("story") : fallback.story;
  const founderPhoto = own("founder")[0] ?? null;
  const story = sections.filter((s) => s.kind === "story");
  const founder = sections.find((s) => s.kind === "founder");
  const craft = sections.find((s) => s.kind === "craft");

  return (
    <article>
      {/* Opening */}
      <header className="relative overflow-hidden px-4 pt-16 pb-10 text-center lg:pt-24">
        <GiantWordmark className="top-6 lg:top-4" />
        <p className="relative text-[11px] font-medium tracking-[0.18em] text-gold uppercase">{page.title}</p>
        <h1 className="relative mx-auto mt-5 max-w-3xl font-heading text-[40px] leading-[1.1] text-ink lg:text-[72px]">Heirlooms, reimagined.</h1>
        {intro ? <Prose className="relative mx-auto mt-6 max-w-xl">{intro}</Prose> : null}
      </header>
      <Photo img={hero} sizes="100vw" priority position={ownHero ? undefined : "50% 62%"} className="mx-auto aspect-[4/5] w-full max-w-[1440px] sm:aspect-[16/9] lg:aspect-[21/9]" />

      {/* Brand story: text and image alternating */}
      <div className="mx-auto max-w-6xl space-y-20 px-4 py-20 md:px-6 lg:space-y-28 lg:px-10 lg:py-28">
        {story.map((s, i) => (
          <section key={s.title} aria-labelledby={`story-${i}`} className="grid items-center gap-8 md:grid-cols-2 md:gap-14 lg:gap-20">
            <div className={cn("max-w-md", i % 2 === 1 && "md:order-2 md:justify-self-end")}>
              <Label id={`story-${i}`}>{s.title}</Label>
              <Prose className="mt-5 text-body-lg">{s.body}</Prose>
            </div>
            <Photo img={storyImages[i] ?? null} sizes="(min-width: 768px) 45vw, 100vw" className="aspect-[4/5]" />
          </section>
        ))}
      </div>

      {/* Founder */}
      {founder ? (
        <section aria-labelledby="founder" className="bg-ivory">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-20 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:px-6 lg:gap-16 lg:py-24">
            <Photo img={founderPhoto} sizes="(min-width: 768px) 35vw, 100vw" className="mx-auto aspect-[4/5] w-full max-w-sm bg-paper-warm" />
            <div>
              <Label id="founder">{founder.title}</Label>
              <Prose className="mt-5 text-body-lg">{founder.body}</Prose>
            </div>
          </div>
        </section>
      ) : null}

      {/* Craft */}
      {craft ? (
        <section aria-labelledby="craft" className="mx-auto max-w-2xl px-4 py-20 text-center lg:py-28">
          <ElephantMark className="mx-auto h-9 w-auto text-gold" />
          <h2 id="craft" className="mt-6 font-heading text-h1 text-ink">
            {craft.title}
          </h2>
          <Prose className="mt-6 text-body-lg">{craft.body}</Prose>
        </section>
      ) : null}

      {/* Testimonials */}
      <Suspense>
        <Testimonials />
      </Suspense>

      {/* Close */}
      <section aria-label="Follow Erayah" className="border-t border-mist px-4 py-20 text-center">
        <p className="font-heading text-h2 text-ink">Wear it, then hand it down.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xs border border-ink px-7 text-[12px] font-medium tracking-[0.12em] text-ink uppercase transition-colors duration-300 hover:bg-ink hover:text-ivory"
          >
            <InstagramGlyph size={16} />
            Follow {contact.instagramHandle}
          </a>
          <ButtonLink href={routes.shopAll}>Shop the collection</ButtonLink>
        </div>
      </section>
    </article>
  );
}

async function Testimonials() {
  const items = await getTestimonials();
  if (!items.length) return null;
  return (
    <section aria-labelledby="testimonials" className="bg-paper-warm px-4 py-20 lg:py-24">
      <div className="mb-10 text-center">
        <Label id="testimonials">In their words</Label>
      </div>
      <TestimonialSlider items={items} />
    </section>
  );
}
