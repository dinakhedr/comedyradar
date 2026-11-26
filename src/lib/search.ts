/** Pure helpers for the search page (spec section 8). No database access here. */

export const SEARCH_TABS = ["all", "groups", "comedians", "shows", "tours", "venues"] as const;
export type SearchTab = (typeof SEARCH_TABS)[number];

export const TAB_LABELS: Record<SearchTab, string> = {
  all: "All",
  groups: "Groups",
  comedians: "Comedians",
  shows: "Shows",
  tours: "Tours",
  venues: "Venues",
};

export type HitKind = "comedian" | "group" | "show" | "tour" | "venue";
export type Hit = { kind: HitKind; id: string; score: number };

/** Trims, squashes inner spaces and caps the length. Returns "" for nothing usable. */
export function normalizeQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

/** A query needs at least 2 letters or digits (the database ignores shorter ones). */
export function isSearchable(q: string): boolean {
  return q.replace(/\s+/g, "").length >= 2;
}

export function parseTab(raw: string | string[] | undefined): SearchTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (SEARCH_TABS as readonly string[]).includes(value ?? "") ? (value as SearchTab) : "all";
}

/** Splits database hits by kind, keeping the best score per id, highest first. */
export function groupHits(hits: Hit[]): Record<HitKind, Map<string, number>> {
  const out: Record<HitKind, Map<string, number>> = {
    comedian: new Map(),
    group: new Map(),
    show: new Map(),
    tour: new Map(),
    venue: new Map(),
  };
  for (const h of [...hits].sort((a, b) => b.score - a.score)) {
    const map = out[h.kind];
    if (!map || map.has(h.id)) continue;
    map.set(h.id, h.score);
  }
  return out;
}

/**
 * Orders profiles: direct matches by score first, then related profiles
 * (members of a matched group, groups of a matched comedian) by name.
 */
export function orderProfiles<T extends { id: string; name: string }>(items: T[], scores: Map<string, number>): T[] {
  return [...items].sort((a, b) => {
    const sa = scores.get(a.id) ?? -1;
    const sb = scores.get(b.id) ?? -1;
    return sb - sa || a.name.localeCompare(b.name);
  });
}

/**
 * The best match card: the highest-scoring directly matched group or
 * comedian. Groups win a tie, since a group search should lead with the group.
 */
export function pickBestMatch(
  groupScores: Map<string, number>,
  comedianScores: Map<string, number>,
): { kind: "group" | "comedian"; id: string } | null {
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  const g = top(groupScores);
  const c = top(comedianScores);
  if (!g && !c) return null;
  if (g && (!c || g[1] >= c[1])) return { kind: "group", id: g[0] };
  return { kind: "comedian", id: c![0] };
}

export function searchHref(q: string, tab: SearchTab = "all"): string {
  const params = new URLSearchParams({ q });
  if (tab !== "all") params.set("type", tab);
  return `/search?${params.toString()}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
