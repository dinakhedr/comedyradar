/**
 * Filters, A–Z and sort of the All comedians page (docs/website-spec.md, 7.3).
 * Everything lives in the address, e.g. /comedians?show=podcast&letter=A&sort=az&page=2.
 */

export const COMEDIANS_PER_PAGE = 24;
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type ComediansShow = "all" | "month" | "tour" | "podcast" | "group";
export type ComediansSort = "shows" | "az" | "new";

export type ComediansFilters = {
  q: string;
  show: ComediansShow;
  /** Home country code, e.g. "EG". */
  from: string | null;
  letter: string | null;
  sort: ComediansSort;
  page: number;
};

export const DEFAULT_COMEDIANS_FILTERS: ComediansFilters = {
  q: "",
  show: "all",
  from: null,
  letter: null,
  sort: "shows",
  page: 1,
};

export const SHOW_OPTIONS: { value: ComediansShow; label: string; short: string }[] = [
  { value: "all", label: "All", short: "All" },
  { value: "month", label: "Performing this month", short: "This month" },
  { value: "tour", label: "On tour", short: "On tour" },
  { value: "podcast", label: "Has a podcast", short: "Has a podcast" },
  { value: "group", label: "In a group", short: "In a group" },
];

export const COMEDIANS_SORT_OPTIONS: { value: ComediansSort; label: string; short: string }[] = [
  { value: "shows", label: "Most upcoming shows", short: "Most shows" },
  { value: "az", label: "A–Z", short: "A–Z" },
  { value: "new", label: "Newly added", short: "Newest" },
];

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const oneOf = <T extends string>(v: string, list: { value: T }[], fallback: T): T =>
  list.some((o) => o.value === v) ? (v as T) : fallback;

export function parseComediansFilters(raw: Raw): ComediansFilters {
  const from = first(raw.from).toUpperCase();
  const letter = first(raw.letter).toUpperCase();
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).slice(0, 80),
    show: oneOf(first(raw.show), SHOW_OPTIONS, "all"),
    from: /^[A-Z]{2}$/.test(from) ? from : null,
    letter: LETTERS.includes(letter) ? letter : null,
    sort: oneOf(first(raw.sort), COMEDIANS_SORT_OPTIONS, "shows"),
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 500) : 1,
  };
}

/** The address for a set of filters; defaults are left out. Changing a filter goes back to page 1. */
export function comediansHref(current: ComediansFilters, change: Partial<ComediansFilters> = {}): string {
  const f = { ...current, ...("page" in change ? {} : { page: 1 }), ...change };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.show !== "all") p.set("show", f.show);
  if (f.from) p.set("from", f.from);
  if (f.letter) p.set("letter", f.letter);
  if (f.sort !== "shows") p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  const qs = p.toString();
  return qs ? `/comedians?${qs}` : "/comedians";
}

export type ListedComedian = {
  name: string;
  created_at: string;
  country_code: string | null;
  upcoming_count: number;
  this_month: boolean;
  on_tour: boolean;
  has_podcast: boolean;
  groups: unknown[];
};

/** First letter for the A–Z bar ("#" for names that do not start with A–Z). */
export function nameLetter(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return LETTERS.includes(c) ? c : "#";
}

/** Applies the filters and sort. */
export function filterComedians<T extends ListedComedian>(list: T[], f: ComediansFilters): T[] {
  const q = f.q.toLowerCase();
  const out = list.filter(
    (c) =>
      (!q || c.name.toLowerCase().includes(q)) &&
      (!f.from || c.country_code === f.from) &&
      (!f.letter || nameLetter(c.name) === f.letter) &&
      (f.show === "all" ||
        (f.show === "month" && c.this_month) ||
        (f.show === "tour" && c.on_tour) ||
        (f.show === "podcast" && c.has_podcast) ||
        (f.show === "group" && c.groups.length > 0)),
  );
  const az = (a: T, b: T) => a.name.localeCompare(b.name);
  if (f.sort === "az") return out.sort(az);
  if (f.sort === "new") return out.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || az(a, b));
  return out.sort((a, b) => b.upcoming_count - a.upcoming_count || az(a, b));
}

/** Letters that have at least one comedian (the others are shown greyed out). */
export function usedLetters(list: { name: string }[]): Set<string> {
  return new Set(list.map((c) => nameLetter(c.name)));
}
