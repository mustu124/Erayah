import { Fragment } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { ElephantMark } from "@/components/ui/Logo";
import { getBrandStory, getSiteShell } from "@/lib/data/site";

const DEFAULT_HIGHLIGHT = /(heirlooms,?\s+reimagined)/i;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 2–3 lines, one highlighted phrase, "Our Story", and a quiet Instagram link. */
export async function BrandStory() {
  const [story, shell] = await Promise.all([getBrandStory(), getSiteShell()]);
  if (!story) return null;

  const highlight = story.highlight ? new RegExp(`(${escape(story.highlight)})`, "i") : DEFAULT_HIGHLIGHT;
  const parts = story.text.split(highlight);

  return (
    <section aria-labelledby="brand-story" className="px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-[560px] text-center">
        <ElephantMark className="mx-auto h-10 w-auto text-gold" />
        <h2 id="brand-story" className="sr-only">
          Our story
        </h2>
        <p className="mt-8 font-heading text-[19px] leading-[1.7] text-ink lg:text-[22px]">
          {parts.map((part, i) =>
            i % 2 === 1 ? (
              <span key={i} className="font-script italic">
                {part}
              </span>
            ) : (
              <Fragment key={i}>{part}</Fragment>
            ),
          )}
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <ButtonLink href={story.ctaUrl} variant="outline">
            {story.ctaLabel}
          </ButtonLink>
          <a
            href={shell.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center text-body-sm text-ink/80 underline decoration-ink/30 underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink"
          >
            Follow us on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
