import { describe, expect, it } from "vitest";
import { applyTitle, checkTour, doorsTime, nextDateDefaults, parsePastedDates, tourTabOf, type PastTourDate, type TourDateInput, type TourSame } from "./tour-forms";

const CAIRO = "11111111-1111-4111-8111-111111111111";
const DUBAI = "22222222-2222-4222-8222-222222222222";
const PERF = "c:33333333-3333-4333-8333-333333333333";
const cities = [
  { id: CAIRO, name: "Cairo" },
  { id: DUBAI, name: "Dubai" },
];
const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? null;
const same: TourSame = { title_pattern: "", language: "", price_min: "", price_max: "", currency: "EGP", age_rating: "", doors: "30" };
const row = (o: Partial<TourDateInput> = {}): TourDateInput => ({ date: "2027-01-10", time: "20:30", city_id: DUBAI, venue_id: "", venue_name: "", ticket_url: "", ticket_status: "on_sale", ...o });
const now = new Date("2026-12-01T00:00:00Z");

describe("tour titles and doors", () => {
  it("fills the title pattern", () => {
    expect(applyTitle("", "Gulf Tour", "Dubai")).toBe("Gulf Tour");
    expect(applyTitle("[Tour] — [City]", "Gulf Tour", "Dubai")).toBe("Gulf Tour — Dubai");
    expect(applyTitle("[city]: [tour] live", "Gulf Tour", "Dubai")).toBe("Dubai: Gulf Tour live");
  });
  it("works out doors from the show time", () => {
    expect(doorsTime("20:30", "45")).toBe("19:45");
    expect(doorsTime("20:30", "")).toBe("");
    expect(doorsTime("00:15", "30")).toBe("");
  });
});

describe("checkTour", () => {
  it("turns each date into a show with the tour's shared details", () => {
    const r = checkTour({ performer: PERF, name: "Gulf Tour", description: "" }, [row(), row({ date: "", time: "", city_id: "" }), row({ city_id: CAIRO, ticket_status: "sold_out", ticket_url: "tix.com/a" })], same, { now, cityName, needDates: true });
    expect(r.errors).toEqual({});
    expect(r.values).toHaveLength(2);
    expect(r.values![0].title).toBe("Gulf Tour");
    expect(r.values![0].doors_at).not.toBeNull();
    expect(r.values![1].sold_out).toBe(true);
    expect(r.values![1].ticket_url).toBe("https://tix.com/a");
    expect(r.dateErrors).toHaveLength(3);
  });
  it("needs a name, a performer and a date", () => {
    const r = checkTour({ performer: "", name: "", description: "" }, [], same, { now, cityName, needDates: true });
    expect(r.values).toBeUndefined();
    expect(Object.keys(r.errors).sort()).toEqual(["dates", "name", "performer"]);
  });
  it("gives each date its own errors and drops the link when there is none", () => {
    const r = checkTour({ performer: PERF, name: "Gulf Tour", description: "" }, [row({ date: "2026-11-01" }), row({ ticket_status: "no_link", ticket_url: "not a link" })], same, { now, cityName, needDates: true });
    expect(r.values).toBeUndefined();
    expect(r.dateErrors[0].date).toBeTruthy();
    expect(r.dateErrors[1]).toEqual({});
  });
  it("shows shared errors once, above the dates", () => {
    const r = checkTour({ performer: PERF, name: "Gulf Tour", description: "" }, [row(), row()], { ...same, price_min: "abc" }, { now, cityName, needDates: true });
    expect(r.errors.price).toBeTruthy();
    expect(r.dateErrors).toEqual([{}, {}]);
  });
});

describe("parsePastedDates", () => {
  it("reads several date formats, the city and the venue", () => {
    const r = parsePastedDates("2027-01-10 20:30 Dubai\n12/1/2027 8:30 PM, Cairo, Room Art Space\n2027-01-14 9 pm Dubai\nnext Friday in Cairo\n2027-01-20 Paris", cities);
    expect(r.rows).toEqual([
      { date: "2027-01-10", time: "20:30", city_id: DUBAI, venue_name: "" },
      { date: "2027-01-12", time: "20:30", city_id: CAIRO, venue_name: "Room Art Space" },
      { date: "2027-01-14", time: "21:00", city_id: DUBAI, venue_name: "" },
    ]);
    expect(r.skipped).toEqual(["next Friday in Cairo", "2027-01-20 Paris"]);
  });
});

describe("tourTabOf", () => {
  it("sorts tours into tabs", () => {
    expect(tourTabOf({ status: "draft", upcoming: 2, total: 2 })).toBe("drafts");
    expect(tourTabOf({ status: "published", upcoming: 0, total: 3 })).toBe("past");
    expect(tourTabOf({ status: "pending", upcoming: 0, total: 0 })).toBe("active");
  });
});

describe("nextDateDefaults", () => {
  const past = (over: Partial<PastTourDate> = {}): PastTourDate => ({
    starts_at: "2026-12-11T18:00:00Z", // 8:00 PM Cairo
    doors_at: "2026-12-11T17:30:00Z",
    status: "published",
    city_id: CAIRO,
    venue_id: "33333333-3333-4333-8333-333333333333",
    ticket_url: "https://tazkarti.com/x",
    price_min: 350,
    price_max: 500,
    currency: "EGP",
    language: "Egyptian Arabic",
    age_rating: "16+",
    ...over,
  });
  it("is empty for a tour with no dates", () => {
    expect(nextDateDefaults([])).toEqual({ row: {}, same: {} });
  });
  it("copies the last date, leaving the day empty", () => {
    const r = nextDateDefaults([past({ starts_at: "2026-12-03T17:00:00Z", city_id: DUBAI }), past()]);
    expect(r.row).toEqual({ time: "20:00", city_id: CAIRO, venue_id: "33333333-3333-4333-8333-333333333333", ticket_url: "https://tazkarti.com/x" });
    expect(r.row.date).toBeUndefined();
    expect(r.same).toEqual({ price_min: "350", price_max: "500", currency: "EGP", language: "Egyptian Arabic", age_rating: "16+", doors: "30" });
  });
  it("skips cancelled dates when another date exists", () => {
    const r = nextDateDefaults([past({ starts_at: "2026-12-03T17:00:00Z", city_id: DUBAI }), past({ status: "cancelled" })]);
    expect(r.row.city_id).toBe(DUBAI);
    expect(r.row.time).toBe("19:00");
  });
  it("marks no ticket link and leaves unknown doors and empty fields out", () => {
    const r = nextDateDefaults([past({ ticket_url: null, doors_at: "2026-12-11T17:40:00Z", price_min: null, price_max: null, language: null, age_rating: null, venue_id: null })]);
    expect(r.row).toEqual({ time: "20:00", city_id: CAIRO, ticket_status: "no_link" });
    expect(r.same).toEqual({ currency: "EGP" });
  });
});
