/** Country helpers for the header country menu. */

/** "EG" → 🇪🇬 (two regional indicator letters). Empty for a bad code. */
export function flagOf(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** The country in the address (?country=ae), or null for the default (Egypt). */
export function parseCountry(v: unknown): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && /^[a-zA-Z]{2}$/.test(s) && s.toUpperCase() !== "EG" ? s.toUpperCase() : null;
}

/** Sort order for every country list on the site: Egypt first, then the rest A to Z by name. */
export function byCountryName(a: { code: string; name: string }, b: { code: string; name: string }): number {
  return Number(b.code === "EG") - Number(a.code === "EG") || a.name.localeCompare(b.name);
}

/** One entry per country, Egypt first then by name, from the city list. */
export function countriesOf(cities: { country_code: string; country_name: string }[]): { code: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const c of cities) if (!seen.has(c.country_code)) seen.set(c.country_code, c.country_name);
  return [...seen].map(([code, name]) => ({ code, name })).sort(byCountryName);
}
