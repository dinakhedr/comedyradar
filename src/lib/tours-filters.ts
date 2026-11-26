/**
 * Filters and sort of the All tours page (docs/website-spec.md, 7.2).
 * Everything lives in the address, e.g. /tours?who=group&where=gulf&sort=dates.
 */
import { cairoMidnight, cairoParts } from "./dates";

export const TOURS_STEP = 12;

export type ToursWho = "all" | "comedian" | "group";
export type ToursWhere = "all" | "egypt" | "gulf" | "europe" | "north-america";
export type ToursWhen = "any" | "month" | "3months";
export type ToursSort = "next" | "new" | "dates";

export type ToursFilters = {
  q: string;
  who: ToursWho;
  where: ToursWhere;
  /** Country code (e.g. "AE"), from the Country dropdown. */
  country: string | null;
  when: ToursWhen;
  sort: ToursSort;
  /** How many tours are shown ("Load more" adds 12). */
  show: number;
};

export const DEFAULT_TOURS_FILTERS: ToursFilters = {
  q: "",
  who: "all",
  where: "all",
  country: null,
  when: "any",
  sort: "next",
  show: TOURS_STEP,
};

export const WHO_OPTIONS: { value: ToursWho; label: string }[] = [
  { value: "all", label: "All" },
  { value: "comedian", label: "Comedians" },
  { value: "group", label: "Groups" },
];

/** Regions are the `region` of each country in the database. */
export const WHERE_OPTIONS: { value: ToursWhere; label: string; region: string | null }[] = [
  { value: "all", label: "Everywhere", region: null },
  { value: "egypt", label: "In Egypt", region: "Egypt" },
  { value: "gulf", label: "Gulf", region: "Gulf" },
  { value: "europe", label: "Europe", region: "Europe" },
  { value: "north-america", label: "North America", region: "North America" },
];

export const TOURS_WHEN_OPTIONS: { value: ToursWhen; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3months", label: "Next 3 months" },
  { value: "any", label: "Any time" },
];

export const TOURS_SORT_OPTIONS: { value: ToursSort; label: string; short: string }[] = [
  { value: "next", label: "Next date first", short: "Soonest" },
  { value: "new", label: "Newly announced", short: "Newest" },
  { value: "dates", label: "Most dates", short: "Most dates" },
];

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const oneOf = <T extends string>(v: string, list: { value: T }[], fallback: T): T =>
  list.some((o) => o.value === v) ? (v as T) : fallback;

export function parseToursFilters(raw: Raw): ToursFilters {
  const country = first(raw.country).toUpperCase();
  const show = Number.parseInt(first(raw.show), 10);
  return {
    q: first(raw.q).slice(0, 80),
    who: oneOf(first(raw.who), WHO_OPTIONS, "all"),
    where: oneOf(first(raw.where), WHERE_OPTIONS, "all"),
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    when: oneOf(first(raw.when), TOURS_WHEN_OPTIONS, "any"),
    sort: oneOf(first(raw.sort), TOURS_SORT_OPTIONS, "next"),
    show: Number.isFinite(show) && show > TOURS_STEP ? Math.min(Math.ceil(show / TOURS_STEP) * TOURS_STEP, 240) : TOURS_STEP,
  };
}

/** The address for a set of filters; defaults are left out. Changing a filter starts again at 12 tours. */
export function toursHref(current: ToursFilters, change: Partial<ToursFilters> = {}): string {
  const f = { ...current, ...("show" in change ? {} : { show: TOURS_STEP }), ...change };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.who !== "all") p.set("who", f.who);
  if (f.where !== "all") p.set("where", f.where);
  if (f.country) p.set("country", f.country);
  if (f.when !== "any") p.set("when", f.when);
  if (f.sort !== "next") p.set("sort", f.sort);
  if (f.show > TOURS_STEP) p.set("show", String(f.show));
  const qs = p.toString();
  return qs ? `/tours?${qs}` : "/tours";
}

/** End of the "when" window: end of this Cairo month, or three months from now. */
export function toursWindowEnd(when: ToursWhen, now: Date): Date | null {
  if (when === "any") return null;
  const p = cairoParts(now);
  const months = when === "month" ? 1 : 3;
  const m = p.month - 1 + months;
  if (when === "month") return cairoMidnight(p.year + Math.floor(m / 12), (m % 12) + 1, 1);
  const d = new Date(Date.UTC(p.year, p.month - 1 + 3, p.day));
  return cairoMidnight(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** The upcoming dates of a tour that the filters look at. */
export type TourDateInfo = { starts_at: string; country_code: string; region: string | null; zone: string; signal: string };

export type ListedTour = {
  id: string;
  name: string;
  owner_type: "comedian" | "group";
  owner_name: string;
  cities: string[];
  created_at: string;
  next_show_at: string;
  show_count: number;
  dates: TourDateInfo[];
};

/** Applies the filters and the sort. A tour matches a place or time when at least one upcoming date does. */
export function filterTours<T extends ListedTour>(tours: T[], f: ToursFilters, now: Date): T[] {
  const region = WHERE_OPTIONS.find((o) => o.value === f.where)?.region ?? null;
  const end = toursWindowEnd(f.when, now);
  const q = f.q.toLowerCase();
  const list = tours.filter((t) => {
    if (f.who !== "all" && t.owner_type !== f.who) return false;
    if (q && ![t.name, t.owner_name, ...t.cities].some((x) => x.toLowerCase().includes(q))) return false;
    return t.dates.some(
      (d) =>
        (!region || d.region === region) &&
        (!f.country || d.country_code === f.country) &&
        (!end || Date.parse(d.starts_at) < end.getTime()),
    );
  });
  const byNext = (a: T, b: T) => Date.parse(a.next_show_at) - Date.parse(b.next_show_at);
  if (f.sort === "new") return list.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || byNext(a, b));
  if (f.sort === "dates") return list.sort((a, b) => b.show_count - a.show_count || byNext(a, b));
  return list.sort(byNext);
}

/** The signal badge of a tour: the strongest signal among its upcoming dates. */
export function tourSignal(dates: Pick<TourDateInfo, "signal">[]): "strong" | "fading" | "new" | null {
  for (const s of ["strong", "fading", "new"] as const) if (dates.some((d) => d.signal === s)) return s;
  return null;
}

/** "VISITING EGYPT": a visiting comedian's tour with dates in Egypt. */
export const isVisitingTour = (dates: Pick<TourDateInfo, "zone">[]) => dates.some((d) => d.zone === "inbound");

/** "6 shows · 4 countries · Dec – Feb", or "5 shows · Egypt · Dec" for a tour in one country. */
export function tourCounts(showCount: number, countryCount: number, countryName: string | null, range: string): string {
  const where = countryCount > 1 ? `${countryCount} countries` : countryName;
  return [`${showCount} ${showCount === 1 ? "show" : "shows"}`, where, range].filter(Boolean).join(" · ");
}
