/**
 * Admin Bulk import (Comedians and Shows): reading a CSV file and checking
 * each row against what is already on Comedy Radar. Pure code, no database,
 * so the reading, matching and duplicate rules are tested.
 */
import { checkProfile, slugify, SOCIAL_FIELDS, type ProfileValues } from "./profile-forms";
import { AGE_RATINGS, cairoToIso, cleanTicketUrl, CURRENCIES, MAX_GOOD_TO_KNOW, SHOW_LANGUAGES, showZone } from "./show-forms";

export const MAX_IMPORT_ROWS = 500;

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Reads CSV text into rows of cells. Handles the UTF-8 BOM Excel adds, quoted
 * cells (with commas, line breaks and "" inside), Windows line ends, and files
 * saved with ; or tab between cells (some Excel settings do that).
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const delim = [",", ";", "\t"].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // Leave out empty lines (Excel often adds some at the end).
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** "Show time *" → "show time". */
const headerKey = (h: string) => h.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Lower case, accents and extra spaces removed: for matching names. */
export function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٟـ]/g, "") // Arabic short vowels and tatweel
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .replace(/[.’'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type Table<K extends string> = {
  rows: { line: number; cells: Record<K, string> }[];
  /** A message when the file can't be used at all. */
  error?: string;
};

/** Maps the header row to the template's columns; line numbers are the sheet's row numbers. */
export function readTable<K extends string>(text: string, columns: Record<K, string>, required: K[]): Table<K> {
  const all = parseCsv(text);
  if (all.length === 0) return { rows: [], error: "The file is empty." };
  const header = all[0].map(headerKey);
  const index = {} as Record<K, number>;
  for (const key of Object.keys(columns) as K[]) index[key] = header.indexOf(headerKey(columns[key]));
  const missing = required.filter((k) => index[k] < 0).map((k) => columns[k]);
  if (missing.length) {
    return { rows: [], error: `The header row is missing ${missing.join(", ")}. Please keep the template's first row as it is.` };
  }
  const body = all.slice(1);
  if (body.length === 0) return { rows: [], error: "The file has the header row but no rows under it." };
  if (body.length > MAX_IMPORT_ROWS) return { rows: [], error: `Please import at most ${MAX_IMPORT_ROWS} rows at a time.` };
  return {
    rows: body.map((cells, i) => ({
      line: i + 2,
      cells: Object.fromEntries((Object.keys(columns) as K[]).map((k) => [k, index[k] >= 0 ? (cells[index[k]] ?? "").trim() : ""])) as Record<K, string>,
    })),
  };
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export type RefCountry = { id: string; code: string; name: string; is_market: boolean };
export type RefCity = { id: string; name: string; country_id: string };
export type RefVenue = { id: string; name: string; city_id: string; status: string };
export type RefPerformer = { kind: "comedian" | "group"; id: string; name: string; name_ar: string | null; home_country_id: string | null };
export type RefTour = { id: string; name: string };
export type RefShow = { starts_at: string; city_id: string; status: string; performer_ids: string[] };

const COUNTRY_ALIASES: Record<string, string> = { uae: "AE", emirates: "AE", uk: "GB", england: "GB", britain: "GB", usa: "US", us: "US", america: "US", ksa: "SA", saudi: "SA" };

export function findCountry(raw: string, countries: RefCountry[]): RefCountry | null {
  const v = norm(raw);
  if (!v) return null;
  const code = COUNTRY_ALIASES[v] ?? (/^[a-z]{2}$/.test(v) ? v.toUpperCase() : undefined);
  return countries.find((c) => (code ? c.code === code : norm(c.name) === v)) ?? null;
}

// ---------------------------------------------------------------------------
// Comedians
// ---------------------------------------------------------------------------

export const COMEDIAN_COLUMNS = {
  name: "Name (English)",
  name_ar: "Name (Arabic)",
  country: "Home country",
  bio: "Bio",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
} as const;
export type ComedianKey = keyof typeof COMEDIAN_COLUMNS;

export type RowStatus = "ready" | "skip" | "error";

export type ComedianRow = {
  line: number;
  name: string;
  name_ar: string;
  country: string;
  status: RowStatus;
  /** Why the row is skipped or can't be imported (plain text). */
  message: string;
  values?: ProfileValues & { slug_base: string };
};

export function checkComedians(text: string, ref: { countries: RefCountry[]; performers: RefPerformer[] }): { rows: ComedianRow[]; error?: string } {
  const table = readTable<ComedianKey>(text, COMEDIAN_COLUMNS, ["name"]);
  if (table.error) return { rows: [], error: table.error };
  const existing = new Set(ref.performers.flatMap((p) => [norm(p.name), p.name_ar ? norm(p.name_ar) : ""]).filter(Boolean));
  const inFile = new Map<string, number>();

  const rows = table.rows.map(({ line, cells }): ComedianRow => {
    const base = { line, name: cells.name, name_ar: cells.name_ar, country: cells.country };
    let countryId = "";
    if (cells.country) {
      const c = findCountry(cells.country, ref.countries);
      if (!c) return { ...base, status: "error", message: `We don't know the country "${cells.country}". Use a name like Egypt or a code like EG.` };
      countryId = c.id;
      base.country = c.name;
    }
    const { values, errors } = checkProfile({
      kind: "comedian",
      name: cells.name,
      name_ar: cells.name_ar,
      bio: cells.bio,
      country: countryId,
      socials: Object.fromEntries(SOCIAL_FIELDS.map((s) => [s.key, cells[s.key]])) as Record<(typeof SOCIAL_FIELDS)[number]["key"], string>,
      styles: [],
      language: "",
    });
    if (!values) {
      const first = Object.values(errors)[0] ?? "Please check this row.";
      return { ...base, status: "error", message: first };
    }
    const key = norm(values.name);
    if (existing.has(key) || (values.name_ar && existing.has(norm(values.name_ar)))) {
      return { ...base, status: "skip", message: "Already on Comedy Radar." };
    }
    if (inFile.has(key)) return { ...base, status: "skip", message: `Same name as row ${inFile.get(key)}.` };
    inFile.set(key, line);
    return { ...base, name: values.name, status: "ready", message: "", values: { ...values, slug_base: slugify(values.name, "comedian") } };
  });
  return { rows };
}

// ---------------------------------------------------------------------------
// Shows
// ---------------------------------------------------------------------------

export const SHOW_COLUMNS = {
  title: "Title",
  performers: "Performers",
  date: "Date",
  time: "Show time",
  doors: "Doors open",
  country: "Country",
  city: "City",
  venue: "Venue",
  venue_address: "Venue address",
  ticket_url: "Ticket link",
  price_min: "Price from",
  price_max: "Price to",
  currency: "Currency",
  language: "Language",
  age: "Age",
  tour: "Tour",
  signal: "Signal",
  description: "Description",
  good_to_know: "Good to know",
  source_url: "Source link",
} as const;
export type ShowKey = keyof typeof SHOW_COLUMNS;
const SHOW_REQUIRED: ShowKey[] = ["title", "performers", "date", "time", "country", "city"];

/** A performer of an imported show: one already on the site, or a new Pending comedian. */
export type ImportPerformer = { kind: "comedian" | "group"; id: string; name: string } | { kind: "new"; name: string };

export type ShowValuesOut = {
  title: string;
  slug_base: string;
  description: string | null;
  starts_at: string;
  doors_at: string | null;
  city_id: string;
  venue_id: string | null;
  new_venue: { name: string; address: string | null } | null;
  zone: "local" | "inbound" | "outbound";
  market_country_id: string;
  tour_id: string | null;
  ticket_url: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  language: string | null;
  age_rating: string | null;
  good_to_know: string[];
  signal: "new" | "strong" | "fading";
  source_url: string | null;
  performers: ImportPerformer[];
};

export type ShowRow = {
  line: number;
  title: string;
  date: string;
  time: string;
  place: string;
  venue: string;
  performers: { name: string; isNew: boolean }[];
  status: RowStatus;
  /** Why the row is skipped or can't be imported. */
  message: string;
  /** What will be added along with the show (new venue, new profiles). */
  notes: string[];
  values?: ShowValuesOut;
};

/** "2026-12-11", "2026/12/11" or "2026-12-11 00:00:00" → "2026-12-11". */
export function cleanDate(raw: string): string | null {
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]00:00(?::00)?)?$/.exec(raw.trim());
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** "20:30", "8:30", "20:30:00", "8:30 PM", "8 pm" → "20:30" (24-hour). */
export function cleanTime(raw: string): string | null {
  const m = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*([ap]\.?m\.?)?$/i.exec(raw.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  const ampm = m[3]?.toLowerCase().replace(/\./g, "");
  if (!ampm && m[2] === undefined) return null; // "20" alone is unclear
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function cleanPrice(raw: string): number | null | "invalid" {
  const v = raw.trim().replace(/,/g, "");
  if (!v) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) return "invalid";
  return Number(v);
}

/** The Cairo calendar day of an instant: shows on the same day are compared. */
export function cairoDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export type ShowRef = {
  countries: RefCountry[];
  cities: RefCity[];
  venues: RefVenue[];
  performers: RefPerformer[];
  tours: RefTour[];
  shows: RefShow[];
};

/** Finds one performer by English or Arabic name. "many" when the name fits more than one profile. */
export function findPerformer(name: string, performers: RefPerformer[]): RefPerformer | "many" | null {
  const v = norm(name);
  const hits = performers.filter((p) => norm(p.name) === v || (p.name_ar && norm(p.name_ar) === v));
  if (hits.length > 1) return "many";
  return hits[0] ?? null;
}

export function checkShows(text: string, ref: ShowRef, opts: { now: Date; createMissing: boolean }): { rows: ShowRow[]; error?: string } {
  const table = readTable<ShowKey>(text, SHOW_COLUMNS, SHOW_REQUIRED);
  if (table.error) return { rows: [], error: table.error };

  const firstMarket = [...ref.countries].filter((c) => c.is_market).sort((a, b) => a.code.localeCompare(b.code))[0];
  // Same performer, city and start time = the same show. Same day at another
  // time is only noted, because comedians often do an early and a late show.
  const existing = new Set<string>();
  const existingDay = new Set<string>();
  for (const s of ref.shows) {
    if (s.status === "cancelled") continue;
    for (const p of s.performer_ids) {
      existing.add(`${new Date(s.starts_at).getTime()}|${s.city_id}|${p}`);
      existingDay.add(`${cairoDay(s.starts_at)}|${s.city_id}|${p}`);
    }
  }
  const inFile = new Map<string, number>();

  const rows = table.rows.map(({ line, cells }): ShowRow => {
    const names = cells.performers
      .split(/[;\n]/)
      .map((n) => n.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    const row: ShowRow = {
      line,
      title: cells.title,
      date: cells.date,
      time: cells.time,
      place: [cells.city, cells.country].filter(Boolean).join(", "),
      venue: cells.venue,
      performers: names.map((name) => ({ name, isNew: false })),
      status: "error",
      message: "",
      notes: [],
    };
    const fail = (message: string): ShowRow => ({ ...row, status: "error", message });

    // What and who
    const title = cells.title.replace(/\s+/g, " ").trim();
    if (title.length < 2) return fail("Please add the show title.");
    if (title.length > 120) return fail("Please keep the title under 120 characters.");
    if (names.length === 0) return fail("Please add at least one performer.");
    if (names.length > 16) return fail("Please list at most 16 performers.");
    const performers: ImportPerformer[] = [];
    const missing: string[] = [];
    for (const name of names) {
      const hit = findPerformer(name, ref.performers);
      if (hit === "many") return fail(`"${name}" fits more than one profile. Please use the full English name.`);
      if (hit) {
        if (!performers.some((p) => p.kind !== "new" && p.id === hit.id)) performers.push({ kind: hit.kind, id: hit.id, name: hit.name });
      } else {
        missing.push(name);
        if (!performers.some((p) => p.kind === "new" && norm(p.name) === norm(name))) performers.push({ kind: "new", name });
      }
    }
    row.performers = performers.map((p) => ({ name: p.name, isNew: p.kind === "new" }));
    if (missing.length && !opts.createMissing) {
      return fail(`Not on Comedy Radar yet: ${missing.join(", ")}. Add them in the Comedians section, or tick "Add missing performers".`);
    }
    for (const n of missing) {
      if (!/[A-Za-z]/.test(n) || n.length > 80) return fail(`Please write "${n}" in English letters (up to 80), as on the profile.`);
    }

    // When
    const date = cleanDate(cells.date);
    if (!date) return fail(`Please write the date like 2026-12-11 (you wrote "${cells.date}").`);
    const time = cleanTime(cells.time);
    if (!time) return fail(`Please write the show time like 20:30 (you wrote "${cells.time}").`);
    const starts = cairoToIso(date, time);
    if (!starts) return fail(`"${cells.date}" isn't a real date.`);
    if (new Date(starts) < opts.now) return fail("This date has already passed.");
    row.date = date;
    row.time = time;
    let doors: string | null = null;
    if (cells.doors) {
      const d = cleanTime(cells.doors);
      doors = d ? cairoToIso(date, d) : null;
      if (!doors) return fail(`Please write the doors time like 20:00 (you wrote "${cells.doors}").`);
      if (doors > starts) return fail("Doors should open before the show starts.");
    }

    // Where
    const country = findCountry(cells.country, ref.countries);
    if (!country) return fail(`We don't know the country "${cells.country}". Use a name like Egypt or a code like EG.`);
    const city = ref.cities.find((c) => c.country_id === country.id && norm(c.name) === norm(cells.city));
    if (!city) return fail(`"${cells.city}" isn't a city in ${country.name} on Comedy Radar yet. Add it in Settings first.`);
    row.place = `${city.name}, ${country.name}`;
    let venueId: string | null = null;
    let newVenue: ShowValuesOut["new_venue"] = null;
    const venueName = cells.venue.replace(/\s+/g, " ").trim();
    if (venueName) {
      const v = ref.venues.find((x) => x.city_id === city.id && x.status !== "archived" && norm(x.name) === norm(venueName));
      if (v) {
        venueId = v.id;
        row.venue = v.name;
      } else {
        if (venueName.length < 2 || venueName.length > 80) return fail("Please keep the venue name between 2 and 80 characters.");
        const address = cells.venue_address.trim();
        if (address.length > 200) return fail("Please keep the venue address under 200 characters.");
        newVenue = { name: venueName, address: address || null };
        row.notes.push(`New venue "${venueName}" will be added as Pending.`);
      }
    }

    // Tickets and extras
    const ticket = cleanTicketUrl(cells.ticket_url);
    if (ticket === "invalid") return fail("Please paste the full ticket link, like https://tickets.example.com/show.");
    const source = cleanTicketUrl(cells.source_url);
    if (source === "invalid") return fail("Please paste the full source link, like https://www.instagram.com/p/…");
    const min = cleanPrice(cells.price_min);
    const max = cleanPrice(cells.price_max);
    if (min === "invalid" || max === "invalid") return fail("Please write prices as numbers only, like 350.");
    if (min !== null && max !== null && max < min) return fail("Price to should be higher than Price from.");
    const currency = (cells.currency || "EGP").toUpperCase();
    if (!(CURRENCIES as readonly string[]).includes(currency)) return fail(`Please use one of these currencies: ${CURRENCIES.join(", ")}.`);
    const language = cells.language ? SHOW_LANGUAGES.find((l) => norm(l) === norm(cells.language)) : null;
    if (cells.language && !language) return fail("Please write the language as Arabic, English or Mixed.");
    const ageKey = norm(cells.age).replace(/^all$/, "all ages").replace(/^(\d+)$/, "$1+");
    const age = cells.age ? AGE_RATINGS.find((a) => norm(a) === ageKey) : null;
    if (cells.age && !age) return fail(`Please write the age as ${AGE_RATINGS.join(", ")}.`);
    const signal = (norm(cells.signal) || "new") as ShowValuesOut["signal"];
    if (!["new", "strong", "fading"].includes(signal)) return fail("Please write the signal as New, Strong or Fading.");
    const notes = cells.good_to_know
      .split(/[;\n]/)
      .map((n) => n.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (notes.length > MAX_GOOD_TO_KNOW) return fail(`Please keep Good to know to ${MAX_GOOD_TO_KNOW} notes.`);
    if (notes.some((n) => n.length > 120)) return fail("Please keep each Good to know note under 120 characters.");
    const description = cells.description.trim();
    if (description.length > 2000) return fail("Please keep the description under 2,000 characters.");
    let tourId: string | null = null;
    if (cells.tour) {
      const hits = ref.tours.filter((t) => norm(t.name) === norm(cells.tour));
      if (hits.length !== 1) return fail(hits.length ? `More than one tour is called "${cells.tour}".` : `We couldn't find the tour "${cells.tour}". Add it first, or leave Tour empty.`);
      tourId = hits[0].id;
    }

    // Already on the site, or twice in the file: same performer, city and start time.
    const ids = performers.map((p) => (p.kind === "new" ? `new:${norm(p.name)}` : p.id));
    const keys = ids.map((id) => `${new Date(starts).getTime()}|${city.id}|${id}`);
    if (keys.some((k) => existing.has(k))) return { ...row, status: "skip", message: "Already on Comedy Radar (same performer, city, date and time)." };
    const twin = keys.map((k) => inFile.get(k)).find((v) => v !== undefined);
    if (twin !== undefined) return { ...row, status: "skip", message: `Same performer, city, date and time as row ${twin}.` };
    for (const k of keys) inFile.set(k, line);
    const day = cairoDay(starts);
    if (ids.some((id) => existingDay.has(`${day}|${city.id}|${id}`))) row.notes.push("This performer already has another show that day in this city. Check it isn't the same one.");

    // Zone and market, as the Add a show form works them out.
    const head = performers[0];
    const headRef = head.kind === "new" ? null : ref.performers.find((p) => p.id === head.id);
    const homeCountry = headRef?.home_country_id ? ref.countries.find((c) => c.id === headRef.home_country_id) : undefined;
    const homeInMarket = homeCountry ? homeCountry.is_market : null;
    const market = country.is_market ? country.id : homeInMarket ? homeCountry!.id : (firstMarket?.id ?? country.id);

    if (missing.length) row.notes.push(`New ${missing.length === 1 ? "profile" : "profiles"} added as Pending: ${missing.join(", ")}.`);
    return {
      ...row,
      title,
      status: "ready",
      values: {
        title,
        slug_base: `${slugify(title, "show")}-${date}`,
        description: description || null,
        starts_at: starts,
        doors_at: doors,
        city_id: city.id,
        venue_id: venueId,
        new_venue: newVenue,
        zone: showZone(country.is_market, homeInMarket),
        market_country_id: market,
        tour_id: tourId,
        ticket_url: ticket,
        price_min: min,
        price_max: max,
        currency,
        language: language ?? null,
        age_rating: age ?? null,
        good_to_know: notes,
        signal,
        source_url: source,
        performers,
      },
    };
  });
  return { rows };
}

/** The ready rows' values, for the import. */
export const readyValues = <T extends { status: RowStatus; values?: V }, V>(rows: T[]): V[] =>
  rows.filter((r) => r.status === "ready" && r.values).map((r) => r.values as V);

/** "12 ready · 2 skipped · 1 to fix" */
export function summary(rows: { status: RowStatus }[]) {
  const n = (s: RowStatus) => rows.filter((r) => r.status === s).length;
  return { ready: n("ready"), skip: n("skip"), error: n("error") };
}
