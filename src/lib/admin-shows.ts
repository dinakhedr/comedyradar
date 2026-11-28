/** Admin Shows and tours (spec 11.5 item 4): tabs, filters and labels. */

export const SHOW_TABS = [
  { value: "shows", label: "Single shows" },
  { value: "tours", label: "Tours" },
  { value: "podcasts", label: "Podcasts" },
  { value: "venues", label: "Venues" },
] as const;
export type ShowTab = (typeof SHOW_TABS)[number]["value"];

export const ZONES = [
  { value: "local", label: "In Egypt" },
  { value: "outbound", label: "On tour" },
  { value: "inbound", label: "Visiting" },
] as const;

export const SHOW_STATUSES = [
  { value: "published", label: "Published" },
  { value: "sold_out", label: "Sold out" },
  { value: "pending", label: "In review" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
  { value: "asked", label: "Signal change asked" },
] as const;

export const CONTENT_STATUSES = [
  { value: "published", label: "Published" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;

export const PERIODS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "Next 30 days" },
  { value: "past", label: "Past" },
  { value: "all", label: "All dates" },
] as const;

export const SIGNALS = [
  { value: "none", label: "No signal" },
  { value: "new", label: "New" },
  { value: "strong", label: "Strong" },
  { value: "fading", label: "Fading" },
] as const;
export type Signal = (typeof SIGNALS)[number]["value"];

const pick = <T extends readonly { value: string }[]>(list: T, v: string | undefined, fallback: T[number]["value"] | "") =>
  (list.some((x) => x.value === v) ? v : fallback) as T[number]["value"] | "";

export const showTab = (v?: string): ShowTab => (pick(SHOW_TABS, v, "shows") || "shows") as ShowTab;
export const zoneOf = (v?: string) => pick(ZONES, v, "");
export const showStatusOf = (v?: string) => pick(SHOW_STATUSES, v, "");
export const contentStatusOf = (v?: string) => pick(CONTENT_STATUSES, v, "");
export const periodOf = (v?: string) => pick(PERIODS, v, "upcoming") || "upcoming";
export const isSignal = (v: string): v is Signal => SIGNALS.some((s) => s.value === v);

export const labelOf = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

/** Ticket link check: a web link, missing, or not a web link. */
export function ticketCheck(url: string | null | undefined): "ok" | "missing" | "bad" {
  const u = (url ?? "").trim();
  if (!u) return "missing";
  try {
    const p = new URL(u);
    return (p.protocol === "https:" || p.protocol === "http:") && p.hostname.includes(".") ? "ok" : "bad";
  } catch {
    return "bad";
  }
}

/** Has this date not happened yet? */
export const isFuture = (iso: string) => Date.parse(iso) > Date.now();

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The ?cities= value ("id,id,…") as a clean list of ids. */
export function parseIdList(v: string | undefined, max = 200): string[] {
  const out: string[] = [];
  for (const part of (v ?? "").split(",")) {
    const id = part.trim().toLowerCase();
    if (ID_RE.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

export type FilterCity = { id: string; name: string; country_code: string; country?: string };
export type CountryGroup = { code: string; name: string; cities: FilterCity[] };

/** Cities grouped by country, keeping the order they came in (Egypt first, then A to Z). */
export function groupCities(cities: FilterCity[]): CountryGroup[] {
  const groups: CountryGroup[] = [];
  for (const c of cities) {
    let g = groups.find((x) => x.code === c.country_code);
    if (!g) {
      g = { code: c.country_code, name: c.country || c.country_code, cities: [] };
      groups.push(g);
    }
    g.cities.push(c);
  }
  return groups;
}

/**
 * What the closed Cities box says: "All cities" when nothing is ticked, a
 * country's name when all its cities are ticked, city names otherwise, and
 * "X + N more" past two.
 */
export function citiesSummary(selected: readonly string[], cities: FilterCity[]): string {
  const picked = new Set(selected);
  const parts: string[] = [];
  for (const g of groupCities(cities)) {
    const on = g.cities.filter((c) => picked.has(c.id));
    if (on.length === 0) continue;
    if (on.length === g.cities.length) parts.push(g.name);
    else parts.push(...on.map((c) => c.name));
  }
  if (parts.length === 0) return "All cities";
  if (parts.length <= 2) return parts.join(", ");
  return `${parts[0]} + ${parts.length - 1} more`;
}
