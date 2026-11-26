/**
 * Filters and sort of the All groups page (docs/website-spec.md, 7.4).
 * Everything lives in the address, e.g. /groups?show=tour&style=improv&lang=arabic&sort=az&more=24.
 */
import { isGroupLanguage, isGroupStyle, languageMatches, type GroupLanguage, type GroupStyle } from "./group-styles";

export const GROUPS_STEP = 12;

export type GroupsShow = "all" | "month" | "tour";
export type GroupsSort = "next" | "az" | "new";
export type GroupsFilters = {
  q: string;
  show: GroupsShow;
  style: GroupStyle | null;
  lang: GroupLanguage | null;
  sort: GroupsSort;
  count: number;
};

export const DEFAULT_GROUPS_FILTERS: GroupsFilters = { q: "", show: "all", style: null, lang: null, sort: "next", count: GROUPS_STEP };

export const GROUPS_SHOW_OPTIONS: { value: GroupsShow; label: string; short: string }[] = [
  { value: "all", label: "All groups", short: "All" },
  { value: "month", label: "Performing this month", short: "This month" },
  { value: "tour", label: "On tour", short: "On tour" },
];

export const GROUPS_SORT_OPTIONS: { value: GroupsSort; label: string; short: string }[] = [
  { value: "next", label: "Next show first", short: "Next show" },
  { value: "az", label: "A–Z", short: "A–Z" },
  { value: "new", label: "Newly added", short: "Newest" },
];

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const oneOf = <T extends string>(v: string, list: { value: T }[], fallback: T): T =>
  list.some((o) => o.value === v) ? (v as T) : fallback;

export function parseGroupsFilters(raw: Raw): GroupsFilters {
  const count = Number.parseInt(first(raw.more), 10);
  const style = first(raw.style).toLowerCase();
  const lang = first(raw.lang).toLowerCase();
  return {
    q: first(raw.q).slice(0, 80),
    show: oneOf(first(raw.show), GROUPS_SHOW_OPTIONS, "all"),
    style: isGroupStyle(style) ? style : null,
    lang: isGroupLanguage(lang) ? lang : null,
    sort: oneOf(first(raw.sort), GROUPS_SORT_OPTIONS, "next"),
    count: Number.isFinite(count) && count > GROUPS_STEP ? Math.min(Math.ceil(count / GROUPS_STEP) * GROUPS_STEP, 240) : GROUPS_STEP,
  };
}

/** The address for a set of filters; defaults are left out. Changing a filter starts again at 12 groups. */
export function groupsHref(current: GroupsFilters, change: Partial<GroupsFilters> = {}): string {
  const f = { ...current, ...("count" in change ? {} : { count: GROUPS_STEP }), ...change };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.show !== "all") p.set("show", f.show);
  if (f.style) p.set("style", f.style);
  if (f.lang) p.set("lang", f.lang);
  if (f.sort !== "next") p.set("sort", f.sort);
  if (f.count > GROUPS_STEP) p.set("more", String(f.count));
  const qs = p.toString();
  return qs ? `/groups?${qs}` : "/groups";
}

export type ListedGroup = {
  name: string;
  created_at: string;
  member_names: string[];
  next_show_at: string | null;
  this_month: boolean;
  on_tour: boolean;
  styles: GroupStyle[];
  performing_language: GroupLanguage | null;
};

/** Applies the filters and sort. The search matches the group name or a member's name. */
export function filterGroups<T extends ListedGroup>(list: T[], f: GroupsFilters): T[] {
  const q = f.q.toLowerCase();
  const out = list.filter(
    (g) =>
      (!q || [g.name, ...g.member_names].some((n) => n.toLowerCase().includes(q))) &&
      (!f.style || g.styles.includes(f.style)) &&
      languageMatches(g.performing_language, f.lang) &&
      (f.show === "all" || (f.show === "month" && g.this_month) || (f.show === "tour" && g.on_tour)),
  );
  const az = (a: T, b: T) => a.name.localeCompare(b.name);
  if (f.sort === "az") return out.sort(az);
  if (f.sort === "new") return out.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || az(a, b));
  // Next show first; groups with no dates go last, A–Z.
  const next = (g: T) => (g.next_show_at ? Date.parse(g.next_show_at) : Number.POSITIVE_INFINITY);
  return out.sort((a, b) => next(a) - next(b) || az(a, b));
}
