// Placeholder: proves fonts and colour tokens are wired up.
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory px-4 text-center">
      <h1 className="font-heading text-display tracking-[0.2em] text-ink md:text-[5rem]">
        ERAYAH
      </h1>
      <div className="h-px w-16 bg-gradient-gold" aria-hidden />
      <p className="font-body text-label font-medium uppercase text-ink">
        Heirlooms, Reimagined
      </p>
      <p className="font-script text-h3 text-ink">made to be handed down</p>
    </main>
  );
}
