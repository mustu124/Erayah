// States and union territories of India, as written on addresses.

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

const ALIASES: Record<string, IndianState> = {
  "nct of delhi": "Delhi",
  "new delhi": "Delhi",
  "pondicherry": "Puducherry",
  "orissa": "Odisha",
  "uttaranchal": "Uttarakhand",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
};

const normalise = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();

/** Matches a state name from another source (e.g. India Post) to our list. */
export function matchState(name: string): IndianState | null {
  const n = normalise(name);
  return INDIAN_STATES.find((s) => normalise(s) === n) ?? ALIASES[n] ?? null;
}
