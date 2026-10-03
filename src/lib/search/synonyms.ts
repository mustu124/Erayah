// Search synonyms, applied before querying. The database search
// (search_products) takes space-separated word groups that must all match,
// each with "|"-separated alternatives: "lotus pendant" → "lotus|kumud|padma pendant".

/** Multi-word phrases joined into one token first. */
const PHRASES: [RegExp, string][] = [
  [/\bmother\s+of\s+pearls?\b/g, "mother-of-pearl"],
  [/\bear\s+cuffs?\b/g, "ear-cuff"],
  [/\bshoulder\s+drops?\b/g, "shoulder-drops"],
  [/\bnecklace\s+sets?\b/g, "necklace"],
];

/** word → what it should also find (the word itself is kept too). */
const SYNONYMS: Record<string, string[]> = {
  jhumka: ["jhumkas"], jhumki: ["jhumkas"], jhumkis: ["jhumkas"], jumka: ["jhumkas"], jumki: ["jhumkas"], jhumkas: [],
  chandbali: ["chaandbaalis"], chandbalis: ["chaandbaalis"], chaandbali: ["chaandbaalis"], chaandbaali: ["chaandbaalis"],
  dangler: ["danglers"], dangling: ["danglers"], drop: ["danglers", "drops"],
  stud: ["studs"],
  choker: ["choker"], chokers: ["choker"],
  kundan: ["polki"], jadau: ["polki"], polki: [],
  moti: ["pearl"], pearls: ["pearl"],
  mop: ["mother-of-pearl"],
  moon: ["celestial"], chand: ["celestial"], chaand: ["celestial"],
  elephant: ["gaja"], elephants: ["gaja"], haathi: ["gaja"], hathi: ["gaja"],
  lotus: ["kumud", "padma"],
};

/** Words that never narrow a jewellery search. */
const STOP_WORDS = new Set(["a", "an", "and", "the", "for", "with", "in", "of", "to", "me", "show", "buy"]);

/** Lowercase, accents stripped (Gajā → gaja), punctuation removed. */
export function normaliseQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** The words of a query, phrases joined and stop words dropped. */
export function queryTokens(q: string): string[] {
  let text = normaliseQuery(q);
  for (const [pattern, replacement] of PHRASES) text = text.replace(pattern, replacement);
  return text.split(" ").filter((t) => t && !STOP_WORDS.has(t)).slice(0, 8);
}

/** Expanded query for search_products: "elephant pendant" → "elephant|gaja pendant". */
export function expandQuery(q: string): string {
  return queryTokens(q)
    .map((token) => [...new Set([token, ...(SYNONYMS[token] ?? [])])].join("|"))
    .join(" ");
}
