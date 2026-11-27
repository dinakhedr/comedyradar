/** Searching comedians and groups by name for the Performer picker. */

/** Lower case, no accents, single spaces: "Bóosh  Bshasha" → "boosh bshasha". */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Profiles whose name contains every typed word. Names that start with the
 * text come first, then names with a word starting with it, then the rest,
 * each in alphabetical order. An empty search returns every profile.
 */
export function filterPerformers<T extends { name: string }>(profiles: T[], query: string): T[] {
  const q = normalizeName(query);
  if (!q) return profiles;
  const words = q.split(" ");
  const rank = (name: string) => (name.startsWith(q) ? 0 : name.split(" ").some((w) => w.startsWith(q)) ? 1 : 2);
  return profiles
    .map((p) => ({ p, n: normalizeName(p.name) }))
    .filter(({ n }) => words.every((w) => n.includes(w)))
    .sort((a, b) => rank(a.n) - rank(b.n) || a.n.localeCompare(b.n))
    .map(({ p }) => p);
}
