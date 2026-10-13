import { ButtonLink } from "@/components/ui/Button";
import { getPage } from "@/lib/data/content";
import { routes } from "@/lib/routes";

/** How many paragraphs of the note the homepage shows before "Read more". */
const PARAGRAPHS = 2;

/**
 * The founder's note, taken from the "Our founder" section of the About page
 * (so the owner edits it in one place): its opening paragraphs, her name, and
 * "Read more" leading to Our Story.
 */
export async function FounderNote() {
  const page = await getPage("about");
  const section = page?.body.split(/^##[ \t]+/m).find((chunk) => /^[^\n]*founder/i.test(chunk));
  if (!section) return null;

  const blocks = section
    .split("\n")
    .slice(1)
    .join("\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const signOff = blocks.findIndex((b) => /^with love/i.test(b));
  const note = (signOff === -1 ? blocks : blocks.slice(0, signOff)).slice(0, PARAGRAPHS).map((p) => p.replace(/^["“]|["”]$/g, ""));
  const [name, role] = signOff === -1 ? [] : blocks.slice(signOff + 1).map((b) => b.replace(/\*\*/g, ""));
  if (!note.length) return null;

  return (
    <section aria-labelledby="founder-note" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-[620px] text-center">
        <h2 id="founder-note" className="font-body text-[11px] font-medium tracking-[0.18em] text-gold uppercase">
          Founder&apos;s note
        </h2>
        <blockquote className="mt-7 space-y-5 font-heading text-[18px] leading-[1.7] text-ink lg:text-[21px]">
          {note.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </blockquote>
        {name ? (
          <p className="mt-7 text-body-sm text-ink">
            <span className="font-medium">{name}</span>
            {role ? <span className="block text-ink/65">{role}</span> : null}
          </p>
        ) : null}
        <ButtonLink href={routes.about} variant="outline" className="mt-9">
          Read more
        </ButtonLink>
      </div>
    </section>
  );
}
