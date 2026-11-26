import { describe, expect, it } from "vitest";
import { checkComedians, checkShows, cleanDate, cleanTime, findCountry, norm, parseCsv, summary, type ShowRef } from "./bulk-import";

const EG = { id: "11111111-1111-4111-8111-111111111111", code: "EG", name: "Egypt", is_market: true };
const AE = { id: "22222222-2222-4222-8222-222222222222", code: "AE", name: "United Arab Emirates", is_market: false };
const GB = { id: "33333333-3333-4333-8333-333333333333", code: "GB", name: "United Kingdom", is_market: false };
const CAIRO = { id: "44444444-4444-4444-8444-444444444444", name: "Cairo", country_id: EG.id };
const DUBAI = { id: "55555555-5555-4555-8555-555555555555", name: "Dubai", country_id: AE.id };
const AMIN = { kind: "comedian" as const, id: "66666666-6666-4666-8666-666666666666", name: "Comedian One", name_ar: "كوميديان واحد", home_country_id: EG.id };
const VISITOR = { kind: "comedian" as const, id: "77777777-7777-4777-8777-777777777777", name: "Visiting Comic", name_ar: null, home_country_id: GB.id };
const GROUP = { kind: "group" as const, id: "88888888-8888-4888-8888-888888888888", name: "Example Group", name_ar: null, home_country_id: EG.id };
const VENUE = { id: "99999999-9999-4999-8999-999999999999", name: "Example Venue", city_id: CAIRO.id, status: "published" };
const TOUR = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Example Tour 2027" };

const ref: ShowRef = {
  countries: [EG, AE, GB],
  cities: [CAIRO, DUBAI],
  venues: [VENUE],
  performers: [AMIN, VISITOR, GROUP],
  tours: [TOUR],
  shows: [],
};
const now = new Date("2026-11-26T12:00:00Z");
const SHOW_HEAD = "Title *,Performers *,Date *,Show time *,Doors open,Country *,City *,Venue,Venue address,Ticket link,Price from,Price to,Currency,Language,Age,Tour,Signal,Description,Good to know,Source link";
const show = (cells: string) => `${SHOW_HEAD}\n${cells}`;

describe("parseCsv", () => {
  it("drops the BOM and reads quoted cells", () => {
    const rows = parseCsv('﻿Name,Bio\r\n"Comedian, One","Says ""hi""\nand bye"\r\n\r\n');
    expect(rows).toEqual([
      ["Name", "Bio"],
      ["Comedian, One", 'Says "hi"\nand bye'],
    ]);
  });
  it("reads files saved with semicolons", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("keeps Arabic text", () => {
    expect(parseCsv("﻿Name (Arabic)\nكوميديان واحد")[1][0]).toBe("كوميديان واحد");
  });
});

describe("small cleaners", () => {
  it("dates", () => {
    expect(cleanDate("2026-12-11")).toBe("2026-12-11");
    expect(cleanDate("2026/1/5")).toBe("2026-01-05");
    expect(cleanDate("11/12/2026")).toBeNull();
  });
  it("times", () => {
    expect(cleanTime("20:30")).toBe("20:30");
    expect(cleanTime("8:30 PM")).toBe("20:30");
    expect(cleanTime("8 pm")).toBe("20:00");
    expect(cleanTime("12:15 am")).toBe("00:15");
    expect(cleanTime("20:30:00")).toBe("20:30");
    expect(cleanTime("20")).toBeNull();
    expect(cleanTime("25:00")).toBeNull();
  });
  it("countries by name, code or common short name", () => {
    expect(findCountry("egypt", ref.countries)?.code).toBe("EG");
    expect(findCountry("AE", ref.countries)?.code).toBe("AE");
    expect(findCountry("UAE", ref.countries)?.code).toBe("AE");
    expect(findCountry("UK", ref.countries)?.code).toBe("GB");
    expect(findCountry("Narnia", ref.countries)).toBeNull();
  });
  it("names match without case, accents or extra spaces", () => {
    expect(norm("  Café   Comedy ")).toBe(norm("cafe comedy"));
    expect(norm("أحمد")).toBe(norm("احمد"));
  });
});

describe("checkComedians", () => {
  const HEAD = "﻿Name (English) *,Name (Arabic),Home country,Bio,Instagram,TikTok,YouTube,Facebook";
  it("reads a good row, with a handle and the country", () => {
    const { rows } = checkComedians(`${HEAD}\nNew Comic,كوميديان جديد,EG,Short bio,@newcomic,,,`, { countries: ref.countries, performers: ref.performers });
    expect(rows[0].status).toBe("ready");
    expect(rows[0].values).toMatchObject({ name: "New Comic", name_ar: "كوميديان جديد", home_country_id: EG.id, instagram_url: "https://instagram.com/newcomic", slug_base: "new-comic" });
  });
  it("skips names already on the site (English or Arabic) and twins in the file", () => {
    const { rows } = checkComedians(`${HEAD}\ncomedian one,,,,,,,\nOther,كوميديان واحد,,,,,,\nNew Comic,,,,,,,\nnew comic,,,,,,,`, { countries: ref.countries, performers: ref.performers });
    expect(rows.map((r) => r.status)).toEqual(["skip", "skip", "ready", "skip"]);
    expect(rows[3].message).toContain("row 4");
  });
  it("flags bad rows with a plain reason", () => {
    const { rows } = checkComedians(`${HEAD}\n,,,,,,,x\nSomeone,,Narnia,,,,,\nSomeone Else,,,,not a link,,,`, { countries: ref.countries, performers: [] });
    expect(rows.map((r) => r.status)).toEqual(["error", "error", "error"]);
    expect(rows[1].message).toContain("Narnia");
  });
  it("needs the header row", () => {
    expect(checkComedians("Who,Bio\nX,Y", { countries: [], performers: [] }).error).toContain("Name (English)");
  });
});

describe("checkShows", () => {
  const opts = { now, createMissing: false };
  it("reads a full row and matches performers, venue and tour", () => {
    const { rows } = checkShows(
      show("Friday Night,Comedian One; Example Group,2026-12-11,20:30,20:00,Egypt,Cairo,example venue,,tickets.example.com/x,300,500,,arabic,16,Example Tour 2027,Strong,Desc,Seats first come; No photos,https://www.instagram.com/p/abc"),
      ref,
      opts,
    );
    const r = rows[0];
    expect(r.status).toBe("ready");
    expect(r.values).toMatchObject({
      title: "Friday Night",
      starts_at: "2026-12-11T18:30:00.000Z",
      doors_at: "2026-12-11T18:00:00.000Z",
      city_id: CAIRO.id,
      venue_id: VENUE.id,
      new_venue: null,
      zone: "local",
      market_country_id: EG.id,
      tour_id: TOUR.id,
      ticket_url: "https://tickets.example.com/x",
      price_min: 300,
      price_max: 500,
      currency: "EGP",
      language: "Arabic",
      age_rating: "16+",
      signal: "strong",
      good_to_know: ["Seats first come", "No photos"],
      source_url: "https://www.instagram.com/p/abc",
      slug_base: "friday-night-2026-12-11",
    });
    expect(r.values!.performers.map((p) => p.kind)).toEqual(["comedian", "group"]);
  });

  it("works out the zone like the Add a show form", () => {
    const { rows } = checkShows(show("Show A,Comedian One,2026-12-11,20:30,,AE,Dubai,,,,,,AED,,,,,,,\nShow B,Visiting Comic,2026-12-12,20:30,,Egypt,Cairo,,,,,,,,,,,,,"), ref, opts);
    expect(rows[0].values).toMatchObject({ zone: "outbound", market_country_id: EG.id, currency: "AED" });
    expect(rows[1].values).toMatchObject({ zone: "inbound", market_country_id: EG.id });
  });

  it("adds a new venue as a note", () => {
    const { rows } = checkShows(show("Show A,Comedian One,2026-12-11,20:30,,Egypt,Cairo,Brand New Place,Zamalek,,,,,,,,,,,"), ref, opts);
    expect(rows[0].values?.new_venue).toEqual({ name: "Brand New Place", address: "Zamalek" });
    expect(rows[0].notes[0]).toContain("Pending");
  });

  it("stops unknown performers unless asked to add them", () => {
    const text = show("Show A,Comedian One; Fresh Face,2026-12-11,20:30,,Egypt,Cairo,,,,,,,,,,,,");
    const off = checkShows(text, ref, opts).rows[0];
    expect(off.status).toBe("error");
    expect(off.message).toContain("Fresh Face");
    const on = checkShows(text, ref, { now, createMissing: true }).rows[0];
    expect(on.status).toBe("ready");
    expect(on.values!.performers[1]).toEqual({ kind: "new", name: "Fresh Face" });
    expect(on.performers[1].isNew).toBe(true);
  });

  it("skips shows already on the site and twins in the file", () => {
    const withShow: ShowRef = { ...ref, shows: [{ starts_at: "2026-12-11T18:30:00.000Z", city_id: CAIRO.id, status: "published", performer_ids: [AMIN.id] }] };
    const { rows } = checkShows(
      show(
        [
          "Same,Comedian One,2026-12-11,20:30,,Egypt,Cairo,,,,,,,,,,,,,",
          "Late show,Comedian One,2026-12-11,22:30,,Egypt,Cairo,,,,,,,,,,,,,",
          "Twin A,Example Group,2026-12-12,20:30,,Egypt,Cairo,,,,,,,,,,,,,",
          "Twin B,Example Group,2026-12-12,20:30,,Egypt,Cairo,,,,,,,,,,,,,",
        ].join("\n"),
      ),
      withShow,
      opts,
    );
    expect(rows.map((r) => r.status)).toEqual(["skip", "ready", "ready", "skip"]);
    expect(rows[1].notes.join(" ")).toContain("another show that day");
    expect(rows[3].message).toContain("row 4");
  });

  it("flags bad values with a plain reason", () => {
    const bad = (cells: string) => checkShows(show(cells), ref, opts).rows[0];
    expect(bad("Show A,Comedian One,11/12/2026,20:30,,Egypt,Cairo,,,,,,,,,,,,,").message).toContain("2026-12-11");
    expect(bad("Show A,Comedian One,2026-11-01,20:30,,Egypt,Cairo,,,,,,,,,,,,,").message).toContain("passed");
    expect(bad("Show A,Comedian One,2026-12-11,20:30,,Egypt,Alexandria,,,,,,,,,,,,,").message).toContain("Alexandria");
    expect(bad("Show A,Comedian One,2026-12-11,20:30,21:00,Egypt,Cairo,,,,,,,,,,,,,").message).toContain("Doors");
    expect(bad("Show A,Comedian One,2026-12-11,20:30,,Egypt,Cairo,,,,500,300,,,,,,,,").message).toContain("higher");
    expect(bad("Show A,Comedian One,2026-12-11,20:30,,Egypt,Cairo,,,,,,XYZ,,,,,,,").message).toContain("currencies");
    expect(bad("Show A,Comedian One,2026-12-11,20:30,,Egypt,Cairo,,,,,,,,,No Such Tour,,,,").message).toContain("No Such Tour");
    expect(bad("Show A,Comedian One,2026-12-11,20:30,,Egypt,Cairo,,,,,,,French,,,,,,").message).toContain("Arabic");
  });

  it("gives a file error for a missing header and counts rows", () => {
    expect(checkShows("Title\nX", ref, opts).error).toContain("Performers");
    const { rows } = checkShows(show("Show A,Comedian One,2026-12-11,20:30,,Egypt,Cairo,,,,,,,,,,,,,\nShow B,,2026-12-11,20:30,,Egypt,Cairo,,,,,,,,,,,,,"), ref, opts);
    expect(summary(rows)).toEqual({ ready: 1, skip: 0, error: 1 });
  });
});
