/**
 * Date helpers for Comedy Radar. All times are stored in UTC and shown in
 * Cairo time (Africa/Cairo), as the spec requires.
 */

export const TIME_ZONE = "Africa/Cairo";

export type WhenFilter = "tonight" | "weekend" | "month";
export const WHEN_FILTERS: WhenFilter[] = ["tonight", "weekend", "month"];

export function parseWhen(value: string | string[] | undefined): WhenFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return WHEN_FILTERS.includes(v as WhenFilter) ? (v as WhenFilter) : "month";
}

type Parts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The calendar date and time of an instant, as seen in Cairo. */
export function cairoParts(date: Date): Parts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    weekday: WEEKDAYS.indexOf(p.weekday),
    hour: Number(p.hour),
    minute: Number(p.minute),
  };
}

/** Offset of Cairo from UTC at a given instant, in minutes (e.g. 120 or 180). */
function cairoOffsetMinutes(date: Date): number {
  const p = cairoParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const floored = Math.floor(date.getTime() / 60000) * 60000;
  return Math.round((asUtc - floored) / 60000);
}

/** The UTC instant of midnight at the start of a Cairo calendar day. */
export function cairoMidnight(year: number, month: number, day: number): Date {
  // Start from midnight UTC and correct by Cairo's offset (checked twice for DST changes).
  const guess = Date.UTC(year, month - 1, day);
  let t = guess - cairoOffsetMinutes(new Date(guess)) * 60000;
  t = guess - cairoOffsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

function addCairoDays(p: Parts, days: number): Date {
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return cairoMidnight(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * The time window for a "when" filter, in UTC, starting now.
 * - tonight: now until the end of today (Cairo).
 * - weekend: the Egyptian weekend, Friday and Saturday (Cairo). During the
 *   weekend it starts now; on other days it starts on Friday at midnight.
 * - month ("This month"): the next 30 days, so shows early next month still
 *   appear at the end of a month. Now until midnight (Cairo) 30 days after today.
 */
export function whenRange(when: WhenFilter, now: Date): { from: Date; to: Date } {
  const p = cairoParts(now);
  if (when === "tonight") {
    return { from: now, to: addCairoDays(p, 1) };
  }
  if (when === "weekend") {
    // weekday: 0 Sun ... 5 Fri, 6 Sat
    if (p.weekday === 5 || p.weekday === 6) {
      const daysToSunday = 7 - p.weekday;
      return { from: now, to: addCairoDays(p, daysToSunday) };
    }
    const daysToFriday = 5 - p.weekday;
    return { from: addCairoDays(p, daysToFriday), to: addCairoDays(p, daysToFriday + 2) };
  }
  return { from: now, to: addCairoDays(p, 31) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "8:30 PM" in Cairo time. */
export function formatTime(date: Date): string {
  const p = cairoParts(date);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const ampm = p.hour < 12 ? "AM" : "PM";
  return `${h12}:${String(p.minute).padStart(2, "0")} ${ampm}`;
}

/**
 * The yellow date line on show cards, e.g. "TONIGHT · 8:30 PM",
 * "TOMORROW · 9:00 PM" or "FRI 28 NOV · 9:00 PM".
 */
export function formatShowDateLine(starts: Date, now: Date): string {
  const s = cairoParts(starts);
  const n = cairoParts(now);
  const sameDay = s.year === n.year && s.month === n.month && s.day === n.day;
  const tomorrow = cairoParts(addCairoDays(n, 1));
  const isTomorrow = s.year === tomorrow.year && s.month === tomorrow.month && s.day === tomorrow.day;
  const day = sameDay
    ? "TONIGHT"
    : isTomorrow
      ? "TOMORROW"
      : `${WEEKDAYS[s.weekday].toUpperCase()} ${s.day} ${MONTHS[s.month - 1].toUpperCase()}`;
  return `${day} · ${formatTime(starts)}`;
}

/** "Sat 29 Nov · 9:30 PM" (Spotlight). */
export function formatShowDate(starts: Date): string {
  const s = cairoParts(starts);
  return `${WEEKDAYS[s.weekday]} ${s.day} ${MONTHS[s.month - 1]} · ${formatTime(starts)}`;
}

/** "Nov – Jan" or "Dec" for tour cards. */
export function formatMonthRange(from: Date, to: Date): string {
  const a = cairoParts(from);
  const b = cairoParts(to);
  const first = MONTHS[a.month - 1];
  const last = MONTHS[b.month - 1];
  if (a.year === b.year && a.month === b.month) return first;
  return `${first} – ${last}`;
}
