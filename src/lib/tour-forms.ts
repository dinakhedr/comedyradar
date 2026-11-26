/**
 * Add or edit a tour from the creator dashboard (docs/website-spec.md 11.4 items 8 and 10).
 * Pure checks, shared by the form and the server action. Each tour date is
 * saved as its own show, so dates are checked with the show rules.
 */
import { checkShow, type ShowErrors, type ShowInput, type ShowValues } from "./show-forms";

export const MAX_TOUR_DATES = 40;
export const DEFAULT_TITLE_PATTERN = "[Tour] — [City]";

/** What a date's ticket column says (spec 11.4 item 8). */
export const TICKET_STATUSES = [
  { value: "on_sale", label: "On sale" },
  { value: "sold_out", label: "Sold out" },
  { value: "no_link", label: "No ticket link yet" },
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number]["value"];

/** Doors, the same for every date: minutes before the show. */
export const DOORS_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "30", label: "30 minutes before" },
  { value: "45", label: "45 minutes before" },
  { value: "60", label: "1 hour before" },
] as const;

export type TourDateInput = {
  date: string;
  time: string;
  city_id: string;
  venue_id: string;
  venue_name: string;
  ticket_url: string;
  ticket_status: string;
};

export type TourSame = {
  title_pattern: string;
  language: string;
  price_min: string;
  price_max: string;
  currency: string;
  age_rating: string;
  doors: string;
};

export type TourInput = { performer: string; name: string; description: string };
export type TourErrors = Partial<Record<"performer" | "name" | "description" | "dates" | "title_pattern" | "price" | "currency" | "language" | "age_rating", string>>;
export type TourDateValues = ShowValues & { sold_out: boolean };

/** "[Tour] — [City]" → "Gulf Tour — Dubai". */
export function applyTitle(pattern: string, tour: string, city: string): string {
  const p = pattern.trim() || DEFAULT_TITLE_PATTERN;
  return p.replace(/\[tour\]/gi, tour.trim()).replace(/\[city\]/gi, city.trim()).replace(/\s+/g, " ").trim();
}

/** "20:30" minus 45 minutes → "19:45" (same day; shows start after doors). */
export function doorsTime(time: string, minutes: string): string {
  const m = Number(minutes);
  if (!m || !/^\d{2}:\d{2}$/.test(time)) return "";
  const [h, mi] = time.split(":").map(Number);
  const t = h * 60 + mi - m;
  if (t < 0) return "";
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** A date row with nothing typed in it is ignored. */
export const isBlankDate = (d: TourDateInput) => !d.date && !d.time && !d.city_id && !d.ticket_url.trim() && !d.venue_name.trim() && (!d.venue_id || d.venue_id === "new");

/**
 * Checks the tour and its new dates. `cityName` turns a city id into its name
 * for the title pattern. Each date gets its own errors, in the same order.
 */
export function checkTour(
  t: TourInput,
  dates: TourDateInput[],
  same: TourSame,
  opts: { now: Date; cityName: (id: string) => string | null; needDates: boolean },
): { performer?: { kind: "comedian" | "group"; id: string }; values?: TourDateValues[]; errors: TourErrors; dateErrors: ShowErrors[] } {
  const errors: TourErrors = {};
  const m = /^(c|g):([0-9a-f-]{36})$/i.exec(t.performer.trim());
  if (!m) errors.performer = "Please choose who is touring.";
  const name = t.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Please enter the tour name.";
  else if (name.length > 120) errors.name = "Please use at most 120 characters.";
  if (t.description.trim().length > 2000) errors.description = "Please keep the description under 2,000 characters.";
  if (same.title_pattern.length > 120) errors.title_pattern = "Please use at most 120 characters.";

  const rows = dates.filter((d) => !isBlankDate(d));
  if (rows.length > MAX_TOUR_DATES) errors.dates = `Please add at most ${MAX_TOUR_DATES} dates at a time.`;
  else if (opts.needDates && rows.length === 0) errors.dates = "Please add at least one date.";

  const dateErrors: ShowErrors[] = [];
  const values: TourDateValues[] = [];
  for (const d of dates) {
    if (isBlankDate(d)) {
      dateErrors.push({});
      continue;
    }
    const city = opts.cityName(d.city_id) ?? "";
    const status = TICKET_STATUSES.find((s) => s.value === d.ticket_status)?.value ?? "on_sale";
    const input: ShowInput = {
      performer: t.performer,
      title: applyTitle(same.title_pattern, name || "Tour", city || "City"),
      description: "",
      date: d.date,
      time: d.time,
      doors: doorsTime(d.time, same.doors),
      city_id: d.city_id,
      venue_id: d.venue_id,
      venue_name: d.venue_name,
      venue_address: "",
      ticket_url: status === "no_link" ? "" : d.ticket_url,
      price_min: same.price_min,
      price_max: same.price_max,
      currency: same.currency,
      language: same.language,
      age_rating: same.age_rating,
      good_to_know: "",
      signal_request: "",
      tour_id: "",
    };
    const r = checkShow(input, { now: opts.now });
    // Errors that belong to the whole tour are shown once, above the dates.
    const { performer: _p, title, price, currency, language, age_rating, ...own } = r.errors;
    void _p;
    if (title) errors.title_pattern = "The show title is too long. Please use a shorter pattern or tour name.";
    if (price) errors.price = price;
    if (currency) errors.currency = currency;
    if (language) errors.language = language;
    if (age_rating) errors.age_rating = age_rating;
    dateErrors.push(own);
    if (r.values) values.push({ ...r.values, sold_out: status === "sold_out" });
  }

  const failed = Object.keys(errors).length > 0 || dateErrors.some((e) => Object.keys(e).length > 0);
  if (failed || !m) return { errors, dateErrors };
  return { performer: { kind: m[1].toLowerCase() === "g" ? "group" : "comedian", id: m[2].toLowerCase() }, values, errors, dateErrors };
}

/**
 * "Paste several dates": one per line, like "2026-12-04 20:30 Dubai" or
 * "4/12/2026 8:30 PM, Dubai, Coca-Cola Arena". The city must be on the list;
 * anything after it is taken as the venue name. Lines it can't read come back
 * in `skipped`.
 */
export function parsePastedDates(
  text: string,
  cities: { id: string; name: string }[],
): { rows: Pick<TourDateInput, "date" | "time" | "city_id" | "venue_name">[]; skipped: string[] } {
  const rows: Pick<TourDateInput, "date" | "time" | "city_id" | "venue_name">[] = [];
  const skipped: string[] = [];
  const byName = [...cities].sort((a, b) => b.name.length - a.name.length);
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let rest = line;
    let date = "";
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(rest);
    const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/.exec(rest);
    if (iso) {
      date = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
      rest = rest.slice(iso[0].length);
    } else if (dmy) {
      date = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
      rest = rest.slice(dmy[0].length);
    } else {
      skipped.push(line);
      continue;
    }
    rest = rest.replace(/^[\s,·-]+/, "");
    let time = "";
    // "20:30", "8.30 pm" or "9 PM" (a bare number needs am or pm).
    const tm = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?(?![\w:])/i.exec(rest);
    if (tm && (tm[2] || tm[3])) {
      let h = Number(tm[1]);
      const ap = tm[3]?.toLowerCase();
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      if (h <= 23) time = `${String(h).padStart(2, "0")}:${tm[2] ?? "00"}`;
      rest = rest.slice(tm[0].length);
    }
    rest = rest.replace(/^[\s,·-]+/, "");
    const city = byName.find((c) => rest.toLowerCase().startsWith(c.name.toLowerCase()));
    if (!city) {
      skipped.push(line);
      continue;
    }
    const venue = rest.slice(city.name.length).replace(/^[\s,·-]+/, "").trim();
    rows.push({ date, time, city_id: city.id, venue_name: venue.slice(0, 80) });
  }
  return { rows, skipped };
}

/** Dashboard Tours tabs (spec 11.4 item 10). */
export const TOUR_TABS = [
  { value: "active", label: "Active" },
  { value: "drafts", label: "Drafts" },
  { value: "past", label: "Past" },
] as const;
export type TourTab = (typeof TOUR_TABS)[number]["value"];
export const tourTab = (raw: unknown): TourTab => TOUR_TABS.find((t) => t.value === raw)?.value ?? "active";

/** Which tab a tour belongs in: drafts, past (every date has happened), or active. */
export function tourTabOf(t: { status: string; upcoming: number; total: number }): TourTab {
  if (t.status === "draft") return "drafts";
  if (t.total > 0 && t.upcoming === 0) return "past";
  return "active";
}
