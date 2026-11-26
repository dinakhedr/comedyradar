/** Admin Shows and tours (spec 11.5 item 4): tabs, filters and labels. */

export const SHOW_TABS = [
  { value: "shows", label: "Shows" },
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
