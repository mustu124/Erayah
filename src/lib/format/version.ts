// Some pieces share a name across colours ("Dori Ring" in pink, green and
// white); the colour lives only in the web address (dori-ring-pink). Wherever
// a purchase is recorded or reviewed (cart, checkout, order, invoice, packing
// slip, admin), the version is read back from the address so it's never lost.

const LABELS: Record<string, string> = {
  "mother-of-pearl": "Mother-of-Pearl",
  "green-blue": "Green & Blue",
  multicolour: "Multicolour",
};

const toSlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** "Pink" for ("Dori Ring", "dori-ring-pink"); null when the name already says it all. */
export function versionOf(name: string, slug: string | null | undefined): string | null {
  if (!slug) return null;
  const base = toSlug(name);
  if (!base || slug === base || !slug.startsWith(`${base}-`)) return null;
  const rest = slug.slice(base.length + 1);
  return LABELS[rest] ?? rest.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** "Dori Ring – Pink", or the name unchanged. */
export function nameWithVersion(name: string, slug: string | null | undefined): string {
  const v = versionOf(name, slug);
  return v ? `${name} – ${v}` : name;
}
