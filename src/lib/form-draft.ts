// What a shopper has typed into a form, kept on their own device so a reload
// (or coming back later the same week) doesn't empty it. Never sent anywhere.
// Storage can be unavailable (private mode, blocked site data): every call is
// wrapped, and the form simply starts empty.

const PREFIX = "erayah-draft:";
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

export function loadDraft<T extends Record<string, string>>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const { savedAt, values } = JSON.parse(raw) as { savedAt: number; values: Partial<T> };
    if (Date.now() - savedAt > KEEP_MS) {
      window.localStorage.removeItem(PREFIX + key);
      return fallback;
    }
    // Only known fields, and only strings.
    const out = { ...fallback };
    for (const k of Object.keys(fallback) as (keyof T)[]) {
      if (typeof values[k] === "string") out[k] = values[k] as T[keyof T];
    }
    return out;
  } catch {
    return fallback;
  }
}

export function saveDraft(key: string, values: Record<string, string>): void {
  try {
    if (Object.values(values).every((v) => !v.trim())) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to clear.
  }
}
