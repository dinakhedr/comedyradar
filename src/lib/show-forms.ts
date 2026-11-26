/**
 * Add or edit a show from the creator dashboard (docs/website-spec.md 11.4 items 4 and 9).
 * Pure checks, shared by the form and the server action.
 */
import { LANGUAGE_OPTIONS } from "./shows-filters";

export const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "AED", "SAR", "KWD", "QAR", "BHD", "JOD", "LBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Stored as the label, which the All shows language filter matches. */
export const SHOW_LANGUAGES = LANGUAGE_OPTIONS.map((o) => o.label);
export const AGE_RATINGS = ["All ages", "12+", "16+", "18+"] as const;

/** Signals a creator can ask for; Comedy Radar decides (spec 11.4 item 9). */
export const SIGNAL_REQUESTS = [
  { value: "strong", label: "Strong signal (selling fast)" },
  { value: "fading", label: "Fading signal (last tickets)" },
] as const;

export const MAX_GOOD_TO_KNOW = 6;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Wall-clock date and time in Cairo → an ISO instant. Show times are entered and shown in Cairo time (spec 2). */
export function cairoToIso(date: string, time: string): string | null {
  if (!DATE.test(date) || !TIME.test(time)) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(guess).getUTCDate() !== d) return null; // 2026-02-31 and the like
  // Cairo's offset at that moment (it has summer time), found with Intl.
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(t));
    const get = (k: string) => Number(parts.find((p) => p.type === k)!.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - t;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);
  return new Date(t).toISOString();
}

/** An ISO instant → Cairo wall-clock date and time, for the edit form. */
export function isoToCairo(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (k: string) => parts.find((p) => p.type === k)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** An https ticket link, null when empty, "invalid" otherwise. */
export function cleanTicketUrl(raw: string): string | null | "invalid" {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".") || u.username || u.password) return "invalid";
    u.protocol = "https:";
    return u.toString().slice(0, 500);
  } catch {
    return "invalid";
  }
}

export type ShowInput = {
  performer: string;
  title: string;
  description: string;
  date: string;
  time: string;
  doors: string;
  city_id: string;
  venue_id: string;
  venue_name: string;
  venue_address: string;
  ticket_url: string;
  price_min: string;
  price_max: string;
  currency: string;
  language: string;
  age_rating: string;
  good_to_know: string;
  signal_request: string;
  tour_id: string;
};

export type ShowErrors = Partial<
  Record<
    | "performer"
    | "title"
    | "description"
    | "date"
    | "time"
    | "doors"
    | "city_id"
    | "venue"
    | "ticket_url"
    | "price"
    | "currency"
    | "language"
    | "age_rating"
    | "good_to_know"
    | "tour_id",
    string
  >
>;

export type ShowValues = {
  performer: { kind: "comedian" | "group"; id: string };
  title: string;
  description: string | null;
  starts_at: string;
  doors_at: string | null;
  city_id: string;
  venue_id: string | null;
  new_venue: { name: string; address: string | null } | null;
  ticket_url: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: Currency;
  language: string | null;
  age_rating: string | null;
  good_to_know: string[];
  signal_request: "strong" | "fading" | null;
  tour_id: string | null;
};

function price(raw: string): number | null | "invalid" {
  const v = raw.trim().replace(/,/g, "");
  if (!v) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) return "invalid";
  return Number(v);
}

/**
 * Checks the show form. `now` lets new shows refuse past dates; an edited show
 * that already happened (`allowPast`) can keep its date.
 */
export function checkShow(f: ShowInput, opts: { now: Date; allowPast?: boolean }): { values?: ShowValues; errors: ShowErrors } {
  const errors: ShowErrors = {};

  const m = /^(c|g):([0-9a-f-]{36})$/i.exec(f.performer.trim());
  if (!m || !UUID.test(m[2])) errors.performer = "Please choose who is performing.";

  const title = f.title.trim().replace(/\s+/g, " ");
  if (title.length < 2) errors.title = "Please enter the show title.";
  else if (title.length > 120) errors.title = "Please use at most 120 characters.";
  const description = f.description.trim();
  if (description.length > 2000) errors.description = "Please keep the description under 2,000 characters.";

  const starts = cairoToIso(f.date, f.time);
  if (!DATE.test(f.date)) errors.date = "Please choose the date.";
  else if (!TIME.test(f.time)) errors.time = "Please enter the show time, like 20:30.";
  else if (!starts) errors.date = "Please choose a real date.";
  else if (!opts.allowPast && new Date(starts) < opts.now) errors.date = "This date has already passed.";

  let doors: string | null = null;
  if (f.doors.trim()) {
    doors = starts && TIME.test(f.doors) ? cairoToIso(f.date, f.doors) : null;
    if (!doors) errors.doors = "Please enter the doors time, like 20:00.";
    else if (starts && doors > starts) errors.doors = "Doors should open before the show starts.";
  }

  if (!UUID.test(f.city_id)) errors.city_id = "Please choose the city.";

  let venueId: string | null = null;
  let newVenue: ShowValues["new_venue"] = null;
  if (f.venue_id === "new") {
    const name = f.venue_name.trim().replace(/\s+/g, " ");
    const address = f.venue_address.trim();
    if (name.length < 2 || name.length > 80) errors.venue = "Please enter the venue name.";
    else if (address.length > 200) errors.venue = "Please keep the address under 200 characters.";
    else newVenue = { name, address: address || null };
  } else if (f.venue_id) {
    if (UUID.test(f.venue_id)) venueId = f.venue_id;
    else errors.venue = "Please choose a venue from the list.";
  }

  const ticket = cleanTicketUrl(f.ticket_url);
  if (ticket === "invalid") errors.ticket_url = "Please paste the full ticket link, like https://tickets.example.com/show.";

  const min = price(f.price_min);
  const max = price(f.price_max);
  if (min === "invalid" || max === "invalid") errors.price = "Please enter prices as numbers, like 350.";
  else if (min !== null && max !== null && max < min) errors.price = "The highest price should be more than the lowest.";

  const currency = CURRENCIES.find((c) => c === f.currency);
  if (!currency) errors.currency = "Please choose a currency.";
  if (f.language && !SHOW_LANGUAGES.includes(f.language)) errors.language = "Please choose a language from the list.";
  if (f.age_rating && !(AGE_RATINGS as readonly string[]).includes(f.age_rating)) errors.age_rating = "Please choose an age from the list.";

  const notes = f.good_to_know
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (notes.length > MAX_GOOD_TO_KNOW) errors.good_to_know = `Please keep it to ${MAX_GOOD_TO_KNOW} lines.`;
  else if (notes.some((n) => n.length > 120)) errors.good_to_know = "Please keep each line under 120 characters.";

  if (f.tour_id && !UUID.test(f.tour_id)) errors.tour_id = "Please choose a tour from the list.";
  const signal = SIGNAL_REQUESTS.find((s) => s.value === f.signal_request)?.value ?? null;

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    values: {
      performer: { kind: m![1].toLowerCase() === "g" ? "group" : "comedian", id: m![2].toLowerCase() },
      title,
      description: description || null,
      starts_at: starts!,
      doors_at: doors,
      city_id: f.city_id,
      venue_id: venueId,
      new_venue: newVenue,
      ticket_url: ticket as string | null,
      price_min: min as number | null,
      price_max: max as number | null,
      currency: currency!,
      language: f.language || null,
      age_rating: f.age_rating || null,
      good_to_know: notes,
      signal_request: signal,
      tour_id: f.tour_id || null,
    },
  };
}

/**
 * Coverage zone (spec 1): a show in the launch market is Local, or Inbound when
 * the performer comes from abroad; a show outside it is Outbound.
 */
export function showZone(cityInMarket: boolean, performerHomeInMarket: boolean | null): "local" | "inbound" | "outbound" {
  if (!cityInMarket) return "outbound";
  return performerHomeInMarket === false ? "inbound" : "local";
}

/** Dashboard Shows tabs (spec 11.4 item 9). */
export const SHOW_TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "drafts", label: "Drafts" },
  { value: "review", label: "In review" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
] as const;
export type ShowTab = (typeof SHOW_TABS)[number]["value"];

export const showTab = (raw: unknown): ShowTab => SHOW_TABS.find((t) => t.value === raw)?.value ?? "upcoming";
