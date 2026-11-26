/** Pure helpers for the show page (spec 6.1). No database access here. */
import type { BadgeInfo } from "./show-display";
import { TIME_ZONE, formatTime } from "./dates";

type Signal = "none" | "new" | "strong" | "fading";
type Status = "published" | "sold_out" | "cancelled";
type Zone = "local" | "outbound" | "inbound";

/** "New" only lasts a few days after a show is added (site setting new_signal_days, default 7). */
export function displaySignal(signal: Signal, createdAt: string, now: Date, days = 7): Signal {
  if (signal !== "new") return signal;
  return now.getTime() - Date.parse(createdAt) > days * 86_400_000 ? "none" : "new";
}

export function showBadges(
  show: { status: Status; zone: Zone; signal: Signal; created_at: string },
  performers: { kind: "group" | "comedian" }[],
  now: Date,
): BadgeInfo[] {
  const badges: BadgeInfo[] = [];
  if (show.status === "cancelled") badges.push({ label: "Cancelled", tone: "pink" });
  else if (show.status === "sold_out") badges.push({ label: "Sold out", tone: "pink" });
  else {
    const signal = displaySignal(show.signal, show.created_at, now);
    if (signal === "strong") badges.push({ label: "Strong signal", tone: "pink" });
    if (signal === "fading") badges.push({ label: "Fading signal · Last tickets", tone: "pink" });
    if (signal === "new") badges.push({ label: "New signal", tone: "yellow" });
  }
  const type = performers[0]?.kind === "group" ? "Group show" : performers.length > 1 ? "Lineup" : performers.length ? "Solo" : null;
  if (type) badges.push({ label: type, tone: "plum" });
  badges.push({ label: show.zone === "outbound" ? "On tour" : show.zone === "inbound" ? "Visiting" : "In Egypt", tone: "plum" });
  return badges;
}

/** "EGP 200 – 450", "EGP 300", or null when no price is known. */
export function formatPrice(min: number | null, max: number | null, currency: string): string | null {
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
  if (min == null && max == null) return null;
  if (min != null && max != null && max > min) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  return `${currency} ${fmt((min ?? max)!)}`;
}

/** The ticket seller's site name from the link, e.g. "tazkarti.com". */
export function ticketSite(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "Saturday, 29 November 2026" in Cairo time. */
export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** "Show 9:30 PM · about 90 min" */
export function timeLine(starts: Date, ends: Date | null): string {
  const parts = [`Show ${formatTime(starts)}`];
  if (ends && ends > starts) {
    const minutes = Math.round((ends.getTime() - starts.getTime()) / 60000);
    parts.push(minutes % 60 === 0 && minutes >= 120 ? `about ${minutes / 60} hours` : `about ${minutes} min`);
  }
  return parts.join(" · ");
}

/** "Arabic · 16+" */
export function audienceLine(language: string | null, age: string | null): string | null {
  const parts = [language, age].filter((x): x is string => !!x && x.trim() !== "");
  return parts.length ? parts.join(" · ") : null;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** A one-event calendar file (.ics) for "Add to calendar". */
export function buildIcs(e: { uid: string; title: string; starts: Date; ends: Date | null; location: string; url: string; now: Date }): string {
  const end = e.ends && e.ends > e.starts ? e.ends : new Date(e.starts.getTime() + 2 * 3_600_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Comedy Radar//Shows//EN",
    "BEGIN:VEVENT",
    `UID:${e.uid}@comedyradar`,
    `DTSTAMP:${icsDate(e.now)}`,
    `DTSTART:${icsDate(e.starts)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    `URL:${e.url}`,
    `DESCRIPTION:${icsText(e.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Splits the organiser's description into paragraphs. */
export function paragraphs(text: string | null): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
