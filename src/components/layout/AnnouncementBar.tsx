/** Thin ink strip above the header with one short line of text. */
export function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="bg-ink px-4 py-2 text-center text-[11px] leading-snug tracking-[0.08em] text-ivory">
      <p>{text}</p>
    </div>
  );
}
