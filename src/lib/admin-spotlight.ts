/** Admin Spotlight (spec 11.5 item 6): dates typed in Cairo time, and placement states. */

const TZ = "Africa/Cairo";

/** Minutes Cairo is ahead of UTC at one instant (2 or 3 hours, with summer time). */
function cairoOffsetMinutes(at: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(at));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return (
    (Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute")) -
      Math.floor(at / 60000) * 60000) /
    60000
  );
}

/** "2026-12-05T20:30" typed as Cairo time → ISO string, or null when empty or not a date. */
export function cairoInputToIso(v: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (Number.isNaN(asUtc)) return null;
  let t = asUtc - cairoOffsetMinutes(asUtc) * 60000;
  t = asUtc - cairoOffsetMinutes(t) * 60000;
  return new Date(t).toISOString();
}

/** ISO → "2026-12-05T20:30" in Cairo time, for a datetime-local field. */
export function isoToCairoInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const local = new Date(t + cairoOffsetMinutes(t) * 60000);
  return local.toISOString().slice(0, 16);
}

export const CURRENCIES = ["EGP", "USD", "AED", "SAR", "EUR", "GBP"] as const;
export const isCurrency = (v: string) =>
  (CURRENCIES as readonly string[]).includes(v);

/** A whole number within limits, or the fallback. */
export function intIn(
  v: string,
  min: number,
  max: number,
  fallback: number | null,
): number | null {
  if (!/^-?\d+$/.test(v.trim())) return fallback;
  const n = Number(v);
  return n >= min && n <= max ? n : fallback;
}
