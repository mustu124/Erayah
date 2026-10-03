import { ElephantMark } from "@/components/ui/Logo";

/**
 * A slow band: "COMPLETE THE LOOK" with the elephant mark between repeats,
 * thin hairlines above and below. Pauses on hover; static with reduced motion.
 */
export function Marquee({ text }: { text: string }) {
  const run = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className="flex shrink-0 items-center">
      <span className="px-6 font-heading text-[26px] tracking-[0.08em] whitespace-nowrap text-ink/80 uppercase md:text-[34px] lg:px-8 lg:text-[40px]">
        {text}
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/70 lg:size-12">
        <ElephantMark className="h-5 w-auto text-gold lg:h-6" />
      </span>
    </span>
  ));

  return (
    <div className="marquee overflow-hidden border-y border-gold/50 py-4 lg:py-5" aria-hidden="true">
      <div className="marquee-track flex w-max">
        {run}
        {run}
      </div>
    </div>
  );
}
