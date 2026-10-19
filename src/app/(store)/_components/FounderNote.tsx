import Link from "next/link";

import { type FounderNoteText, getHomeFounderNote } from "@/lib/data/content";
import { routes } from "@/lib/routes";

/**
 * The founder's note on the homepage: a shorter version of the one on Our
 * Story, with a link to the full story. Edited in Admin → Homepage; until it
 * has been saved there, the owner's round 5 wording below is shown.
 */
export const DEFAULT_FOUNDER_NOTE: FounderNoteText = {
  name: "Bhavi Shah",
  role: "Founder & Creative Director",
  paragraphs: [
  "Some things are too beautiful to be saved for another day. I believe jewellery is one of them.",
  "For the longest time, I found myself reaching for the same few pieces, while so much of the jewellery I loved stayed tucked away. Some pieces felt too contemporary, while others belonged to occasions that came around only once in a while. I wanted jewellery that held the beauty of our traditions but felt natural to wear in my own way.",
  "That thought became ERAYAH.",
  ],
};

export async function FounderNote() {
  const note = (await getHomeFounderNote()) ?? DEFAULT_FOUNDER_NOTE;
  return (
    <section aria-labelledby="founder-note" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-[620px] text-center">
        <h2 id="founder-note" className="font-body text-[11px] font-medium tracking-[0.18em] text-gold uppercase">
          Founder&apos;s note
        </h2>
        <blockquote className="mt-7 space-y-5 font-heading text-[18px] leading-[1.7] text-ink lg:text-[21px]">
          {note.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </blockquote>
        {note.name ? (
          <p className="mt-7 text-body-sm text-ink">
            <span className="font-medium">{note.name}</span>
            {note.role ? <span className="block text-ink/65">{note.role}</span> : null}
          </p>
        ) : null}
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
