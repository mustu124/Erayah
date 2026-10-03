// Collection filters and sort, encoded in the URL so links are shareable and
// the back button works. Shared by server (parsing searchParams) and client
// (building the next URL).

export const PAGE_SIZE = 24;

export const COLOURS = ["white", "green", "pink", "blue", "red", "turquoise", "multicolour", "pearl"] as const;
export type Colour = (typeof COLOURS)[number];

export const STYLES = [
  "studs", "danglers", "jhumkas", "chaandbaalis", "bali", "ear cuff", "shoulder drops", "drops",
  "choker", "necklace set", "pendant", "ring", "stackable", "minimal", "statement", "pearl",
  "mother-of-pearl", "polki", "jadau", "kundan", "celestial", "nature", "animal",
] as const;

export const SORTS = [
  { value: "curated", label: "Curated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest to Oldest" },
  { value: "oldest", label: "Oldest to Newest" },
] as const;
export type SortKey = (typeof SORTS)[number]["value"];

export type Availability = "in_stock" | "sold_out";

export type Filters = {
  availability: Availability[];
  /** Price bounds in whole rupees. */
  min: number | null;
  max: number | null;
  colours: string[];
  categories: string[];
  styles: string[];
  gift: boolean;
  sort: SortKey;
  page: number;
};

export const EMPTY_FILTERS: Filters = {
  availability: [],
  min: null,
  max: null,
  colours: [],
  categories: [],
  styles: [],
  gift: false,
  sort: "curated",
  page: 1,
};

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function read(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

const list = (value: string | undefined, allowed?: readonly string[]) =>
  [...new Set((value ?? "").split(",").map((v) => v.trim()).filter(Boolean))].filter(
    (v) => !allowed || allowed.includes(v),
  );

const whole = (value: string | undefined) => {
  const n = Number(value);
  return value && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/** Reads filters from searchParams, ignoring anything invalid. */
export function parseFilters(params: RawParams): Filters {
  const sort = read(params, "sort");
  const page = whole(read(params, "page"));
  return {
    availability: list(read(params, "availability"), ["in_stock", "sold_out"]) as Availability[],
    min: whole(read(params, "min")),
    max: whole(read(params, "max")),
    colours: list(read(params, "colour"), COLOURS),
    categories: list(read(params, "category")).filter((c) => /^[a-z0-9-]+$/.test(c)),
    styles: list(read(params, "style"), STYLES),
    gift: read(params, "gift") === "1",
    sort: SORTS.some((s) => s.value === sort) ? (sort as SortKey) : "curated",
    page: page && page > 0 ? page : 1,
  };
}

/** Builds the query string for filters, leaving out defaults (so page 1 and Curated have clean URLs). */
export function toSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.availability.length) params.set("availability", filters.availability.join(","));
  if (filters.min !== null) params.set("min", String(filters.min));
  if (filters.max !== null) params.set("max", String(filters.max));
  if (filters.colours.length) params.set("colour", filters.colours.join(","));
  if (filters.categories.length) params.set("category", filters.categories.join(","));
  if (filters.styles.length) params.set("style", filters.styles.join(","));
  if (filters.gift) params.set("gift", "1");
  if (filters.sort !== "curated") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function hrefWith(path: string, filters: Filters): string {
  const query = toSearchParams(filters).toString();
  return query ? `${path}?${query}` : path;
}

/** True when any filter (not sort or page) is applied. */
export function hasActiveFilters(f: Filters): boolean {
  return (
    f.availability.length > 0 ||
    f.min !== null ||
    f.max !== null ||
    f.colours.length > 0 ||
    f.categories.length > 0 ||
    f.styles.length > 0 ||
    f.gift
  );
}

/** A stable string for cache keys. */
export function filtersKey(f: Filters): string {
  return JSON.stringify({ ...f, availability: [...f.availability].sort(), colours: [...f.colours].sort(), categories: [...f.categories].sort(), styles: [...f.styles].sort() });
}

const STYLE_LABELS: Record<string, string> = {
  "ear cuff": "Ear cuffs",
  "shoulder drops": "Shoulder drops",
  "necklace set": "Necklace sets",
  choker: "Chokers",
  pendant: "Pendants",
  ring: "Rings",
  bali: "Balis",
  "mother-of-pearl": "Mother-of-pearl",
};

export function styleLabel(style: string): string {
  return STYLE_LABELS[style] ?? style.charAt(0).toUpperCase() + style.slice(1);
}

export function colourLabel(colour: string): string {
  return colour.charAt(0).toUpperCase() + colour.slice(1);
}
