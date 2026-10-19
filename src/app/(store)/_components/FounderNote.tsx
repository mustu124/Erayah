import Link from "next/link";

import { routes } from "@/lib/routes";

/**
 * The founder's note on the homepage: a shorter version of the one on Our
 * Story, in the owner's words (round 5 revisions), with a link to the full story.
 */
const NOTE = [
  "Some things are too beautiful to be saved for another day. I believe jewellery is one of them.",
  "For the longest time, I found myself reaching for the same few pieces, while so much of the jewellery I loved stayed tucked away. Some pieces felt too contemporary, while others belonged to occasions that came around only once in a while. I wanted jewellery that held the beauty of our traditions but felt natural to wear in my own way.",
  "That thought became ERAYAH.",
];

export function FounderNote() {
  return (
    <section aria-labelledby="founder-note" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-[620px] text-center">
        <h2 id="founder-note" className="font-body text-[11px] font-medium tracking-[0.18em] text-gold uppercase">
          Founder&apos;s note
        </h2>
        <blockquote className="mt-7 space-y-5 font-heading text-[18px] leading-[1.7] text-ink lg:text-[21px]">
          {NOTE.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </blockquote>
        <p className="mt-7 text-body-sm text-ink">
          <span className="font-medium">Bhavi Shah</span>
          <span className="block text-ink/65">Founder &amp; Creative Director</span>
        </p>
        <Link
          href={routes.about}
          className="mt-8 inline-flex min-h-11 items-center text-body-sm text-ink underline decoration-ink/40 underline-offset-4 transition-colors duration-300 hover:decoration-ink"
        >
          Read our story <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </section>
  );
}
