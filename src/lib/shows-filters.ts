/**
 * Filters, sort and pages of the All shows page (docs/website-spec.md, 7.1).
 * Everything lives in the address, e.g.
 * /shows?when=weekend&zone=local&city=cairo&sort=new&page=2, so results can be shared.
 */
import { cairoMidnight, cairoParts, whenRange } from "./dates";

export const SHOWS_PER_PAGE = 24;

export type ShowsWhen = "tonight" | "weekend" | "month" | "next" | "dates";
export type ShowsZone = "all" | "local" | "outbound" | "inbound";
export type ShowsType = "all" | "comedian" | "group";
export type ShowsSort = "date" | "new" | "trending";
export type ShowsLanguage = "arabic" | "english" | "mixed";

export type ShowsFilters = {
  q: string;
  when: ShowsWhen;
  /** Pick dates: first and last day (YYYY-MM-DD, Cairo days). */
  from: string | null;
  to: string | null;
  zone: ShowsZone;
  city: string | null;
  /** Performer filter: a comedian or a group, by slug. */
  comedian: string | null;
  group: string | null;
  type: ShowsType;
  lang: ShowsLanguage | null;
  hideSoldOut: boolean;
  sort: ShowsSort;
  page: number;
};

export const DEFAULT_FILTERS: ShowsFilters = {
  q: "",
  when: "month",
  from: null,
  to: null,
  zone: "all",
  city: null,
  comedian: null,
  group: null,
  type: "all",
  lang: null,
  hideSoldOut: false,
  sort: "date",
  page: 1,
};

export const WHEN_OPTIONS: { value: ShowsWhen; label: string }[] = [
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "This weekend" },
  { value: "month", label: "This month" },
  { value: "next", label: "Next month" },
];

export const ZONE_OPTIONS: { value: ShowsZone; label: string }[] = [
  { value: "all", label: "All" },
  { value: "local", label: "In Egypt" },
  { value: "outbound", label: "On tour abroad" },
  { value: "inbound", label: "Visiting comedians" },
];

export const TYPE_OPTIONS: { value: ShowsType; label: string }[] = [
  { value: "all", label: "Comedians and groups" },
  { value: "comedian", label: "Comedians" },
  { value: "group", label: "Groups" },
];

export const LANGUAGE_OPTIONS: { value: ShowsLanguage; label: string }[] = [
  { value: "arabic", label: "Arabic" },
  { value: "english", label: "English" },
  { value: "mixed", label: "Mixed" },
];

export const SORT_OPTIONS: { value: ShowsSort; label: string; short: string }[] = [
  { value: "date", label: "Date: soonest first", short: "Soonest" },
  { value: "new", label: "Newly added", short: "Newest" },
  { value: "trending", label: "Trending", short: "Trending" },
];

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const oneOf = <T extends string>(v: string, list: { value: T }[], fallback: T): T =>
  list.some((o) => o.value === v) ? (v as T) : fallback;
const slug = (v: string) => (/^[a-z0-9-]{1,80}$/.test(v) ? v : null);
const isoDay = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);

/** Reads the filters from the address; anything unknown falls back to the default. */
export function parseShowsFilters(raw: Raw, preset: { city?: string } = {}): ShowsFilters {
  const whenRaw = first(raw.when);
  let from = isoDay(first(raw.from));
  let to = isoDay(first(raw.to));
  if (from && to && from > to) [from, to] = [to, from];
  const when: ShowsWhen =
    whenRaw === "dates" ? (from || to ? "dates" : "month") : oneOf(whenRaw, WHEN_OPTIONS, "month");
  const comedian = slug(first(raw.comedian));
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).slice(0, 80),
    when,
    from: when === "dates" ? from : null,
    to: when === "dates" ? to : null,
    zone: oneOf(first(raw.zone), ZONE_OPTIONS, "all"),
    city: preset.city ?? slug(first(raw.city)),
    comedian,
    group: comedian ? null : slug(first(raw.group)),
    type: oneOf(first(raw.type), TYPE_OPTIONS, "all"),
    lang: (LANGUAGE_OPTIONS.find((o) => o.value === first(raw.lang))?.value ?? null) as ShowsLanguage | null,
    hideSoldOut: first(raw.soldout) === "hide",
    sort: oneOf(first(raw.sort), SORT_OPTIONS, "date"),
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 500) : 1,
  };
}

/**
 * The address for a set of filters; defaults are left out. Changing any
 * filter goes back to page 1, unless the page itself is what changes.
 */
export function showsHref(
  current: ShowsFilters,
  change: Partial<ShowsFilters> = {},
  base = "/shows",
): string {
  const f = { ...current, ...("page" in change ? {} : { page: 1 }), ...change };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.when !== "month") p.set("when", f.when);
  if (f.when === "dates") {
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
  }
  if (f.zone !== "all") p.set("zone", f.zone);
  // On /shows/city/[city] the city is part of the path.
  if (f.city && base === "/shows") p.set("city", f.city);
  if (f.comedian) p.set("comedian", f.comedian);
  else if (f.group) p.set("group", f.group);
  if (f.type !== "all") p.set("type", f.type);
  if (f.lang) p.set("lang", f.lang);
  if (f.hideSoldOut) p.set("soldout", "hide");
  if (f.sort !== "date") p.set("sort", f.sort);
  if (f.page > 1) p.set("page", String(f.page));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

function dayStart(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return cairoMidnight(y, m, d);
}

function nextDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const n = new Date(Date.UTC(y, m - 1, d + 1));
  return cairoMidnight(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate());
}

/** The time window of the "when" filter, in UTC. Never starts before now. */
export function showsWindow(f: Pick<ShowsFilters, "when" | "from" | "to">, now: Date): { from: Date; to: Date | null } {
  if (f.when === "next") {
    const p = cairoParts(now);
    const start = p.month === 12 ? { y: p.year + 1, m: 1 } : { y: p.year, m: p.month + 1 };
    const end = start.m === 12 ? { y: start.y + 1, m: 1 } : { y: start.y, m: start.m + 1 };
    return { from: cairoMidnight(start.y, start.m, 1), to: cairoMidnight(end.y, end.m, 1) };
  }
  if (f.when === "dates") {
    const from = f.from ? dayStart(f.from) : now;
    return { from: from < now ? now : from, to: f.to ? nextDay(f.to) : null };
  }
  return whenRange(f.when, now);
}

/** Number of filters set beyond "when" and sort (the "Filters (N)" button on mobile). */
export function countMoreFilters(f: ShowsFilters): number {
  return [f.zone !== "all", !!f.city, !!(f.comedian || f.group), f.type !== "all", !!f.lang, f.hideSoldOut].filter(
    Boolean,
  ).length;
}

export type FilterChip = { label: string; remove: Partial<ShowsFilters> };

/** Removable chips for the active filters (mobile). Labels for city and performer are passed in. */
export function activeChips(
  f: ShowsFilters,
  names: { city?: string | null; performer?: string | null } = {},
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, remove: { q: "" } });
  if (f.when === "dates") chips.push({ label: datesLabel(f.from, f.to), remove: { when: "month", from: null, to: null } });
  if (f.city) chips.push({ label: names.city ?? f.city, remove: { city: null } });
  if (f.zone !== "all") chips.push({ label: ZONE_OPTIONS.find((o) => o.value === f.zone)!.label, remove: { zone: "all" } });
  if (f.comedian || f.group)
    chips.push({ label: names.performer ?? (f.comedian ?? f.group)!, remove: { comedian: null, group: null } });
  if (f.type !== "all") chips.push({ label: TYPE_OPTIONS.find((o) => o.value === f.type)!.label, remove: { type: "all" } });
  if (f.lang) chips.push({ label: LANGUAGE_OPTIONS.find((o) => o.value === f.lang)!.label, remove: { lang: null } });
  if (f.hideSoldOut) chips.push({ label: "No sold out", remove: { hideSoldOut: false } });
  return chips;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

/** "5 Dec – 12 Dec", "From 5 Dec", "Until 12 Dec". */
export function datesLabel(from: string | null, to: string | null): string {
  if (from && to) return from === to ? shortDay(from) : `${shortDay(from)} – ${shortDay(to)}`;
  if (from) return `From ${shortDay(from)}`;
  if (to) return `Until ${shortDay(to)}`;
  return "Pick dates";
}

/** The label of the "when" filter in the results bar ("This month", "5 Dec – 12 Dec"). */
export function whenLabel(f: Pick<ShowsFilters, "when" | "from" | "to">): string {
  if (f.when === "dates") return datesLabel(f.from, f.to);
  return WHEN_OPTIONS.find((o) => o.value === f.when)!.label;
}

/** Page numbers with gaps: [1, 2, 3, "…", 9] (current page and its neighbours, first and last). */
export function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => keep.add(n));
  const nums = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** "Showing 1–24 of 57 shows". */
export function showingLine(page: number, total: number, perPage = SHOWS_PER_PAGE): string {
  if (total === 0) return "Showing 0 shows";
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return `Showing ${start}–${end} of ${total} ${total === 1 ? "show" : "shows"}`;
}

/** Trending order: Strong Signal first, then Fading Signal (last tickets), then New, then the rest; soonest first within each. */
const TREND_RANK: Record<string, number> = { strong: 0, fading: 1, new: 2, none: 3 };
export function trendingSort<T extends { display_signal: string; status: string; starts_at: string }>(shows: T[]): T[] {
  const rank = (s: T) => (s.status === "sold_out" ? 4 : (TREND_RANK[s.display_signal] ?? 3));
  return [...shows].sort((a, b) => rank(a) - rank(b) || Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

/** Makes the free-text search safe inside a PostgREST or() filter. */
export function ilikeTerm(q: string): string | null {
  const clean = q.replace(/[,()*%\\"'.:]/g, " ").replace(/\s+/g, " ").trim();
  return clean.length >= 2 ? `%${clean}%` : null;
}
