/** Pure helpers for the tour page (spec 6.2). No database access here. */
import { cairoParts, formatMonthRange, formatTime } from "./dates";

type DateLike = { starts_at: string; status: string; zone: "local" | "outbound" | "inbound"; country_code: string; country_name: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Upcoming dates (soonest first) and past ones (most recent first). Cancelled dates stay where they fall. */
export function splitDates<T extends DateLike>(dates: T[], now: Date): { upcoming: T[]; past: T[] } {
  const sorted = [...dates].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  return {
    upcoming: sorted.filter((d) => Date.parse(d.starts_at) >= now.getTime()),
    past: sorted.filter((d) => Date.parse(d.starts_at) < now.getTime()).reverse(),
  };
}

/** The three stat tiles: number of shows, countries, and the month range with its year. */
export function tourStats(dates: DateLike[]): { shows: number; countries: number; months: string | null; year: string | null } {
  const live = dates.filter((d) => d.status !== "cancelled");
  if (live.length === 0) return { shows: 0, countries: 0, months: null, year: null };
  const times = live.map((d) => Date.parse(d.starts_at));
  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  const y1 = cairoParts(first).year;
  const y2 = cairoParts(last).year;
  return {
    shows: live.length,
    countries: new Set(live.map((d) => d.country_code)).size,
    months: formatMonthRange(first, last),
    year: y1 === y2 ? String(y1) : `${y1} – ${y2}`,
  };
}

/** Country chips: "All (8) · UAE (2) …", in order of each country's first date. */
export function countryCounts(dates: DateLike[]): { code: string; name: string; count: number }[] {
  const map = new Map<string, { code: string; name: string; count: number }>();
  for (const d of dates) {
    const c = map.get(d.country_code) ?? { code: d.country_code, name: d.country_name, count: 0 };
    c.count += 1;
    map.set(d.country_code, c);
  }
  return [...map.values()];
}

/** Zone badge for the whole tour: the zone most of its dates share. */
export function tourZoneLabel(dates: DateLike[]): string | null {
  if (dates.length === 0) return null;
  const counts = { local: 0, outbound: 0, inbound: 0 };
  for (const d of dates) counts[d.zone] += 1;
  const top = (Object.keys(counts) as (keyof typeof counts)[]).sort((a, b) => counts[b] - counts[a])[0];
  return top === "outbound" ? "On tour abroad" : top === "inbound" ? "Visiting Egypt" : "In Egypt";
}

/** Date tile and line for one tour date: { day: "28", month: "NOV", line: "Fri · 8:00 PM" }. */
export function dateTile(startsAt: string): { day: string; month: string; line: string } {
  const d = new Date(startsAt);
  const p = cairoParts(d);
  return { day: String(p.day), month: MONTHS[p.month - 1].toUpperCase(), line: `${WEEKDAYS[p.weekday]} · ${formatTime(d)}` };
}

/** "28 Nov" for the past dates list. */
export function shortDate(startsAt: string): string {
  const p = cairoParts(new Date(startsAt));
  return `${p.day} ${MONTHS[p.month - 1]}`;
}
