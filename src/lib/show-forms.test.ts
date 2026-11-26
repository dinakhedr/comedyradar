import { describe, expect, it } from "vitest";
import { cairoToIso, checkShow, cleanTicketUrl, isoToCairo, showZone, type ShowInput } from "./show-forms";

const now = new Date("2026-11-26T10:00:00Z");
const base: ShowInput = {
  performer: "c:11111111-1111-4111-8111-111111111111",
  title: "  Badr   Live ",
  description: "",
  date: "2026-12-10",
  time: "20:30",
  doors: "",
  city_id: "22222222-2222-4222-8222-222222222222",
  venue_id: "",
  venue_name: "",
  venue_address: "",
  ticket_url: "",
  price_min: "",
  price_max: "",
  currency: "EGP",
  language: "",
  age_rating: "",
  good_to_know: "",
  signal_request: "",
  tour_id: "",
};

describe("cairoToIso", () => {
  it("reads times as Cairo time, winter and summer", () => {
    expect(cairoToIso("2026-12-10", "20:30")).toBe("2026-12-10T18:30:00.000Z");
    expect(cairoToIso("2026-07-10", "20:30")).toBe("2026-07-10T17:30:00.000Z");
    expect(cairoToIso("2026-02-31", "20:30")).toBeNull();
  });
  it("round-trips with isoToCairo", () => {
    expect(isoToCairo("2026-12-10T18:30:00.000Z")).toEqual({ date: "2026-12-10", time: "20:30" });
  });
});

describe("checkShow", () => {
  it("accepts a minimal show and cleans it", () => {
    const { values, errors } = checkShow(base, { now });
    expect(errors).toEqual({});
    expect(values).toMatchObject({ title: "Badr Live", performer: { kind: "comedian" }, currency: "EGP", venue_id: null, good_to_know: [] });
  });
  it("refuses past dates, late doors and bad prices", () => {
    expect(checkShow({ ...base, date: "2026-11-01" }, { now }).errors.date).toBeTruthy();
    expect(checkShow({ ...base, date: "2026-11-01" }, { now, allowPast: true }).errors.date).toBeUndefined();
    expect(checkShow({ ...base, doors: "21:00" }, { now }).errors.doors).toBeTruthy();
    expect(checkShow({ ...base, price_min: "500", price_max: "300" }, { now }).errors.price).toBeTruthy();
    expect(checkShow({ ...base, price_min: "abc" }, { now }).errors.price).toBeTruthy();
  });
  it("needs a name for a new venue", () => {
    expect(checkShow({ ...base, venue_id: "new" }, { now }).errors.venue).toBeTruthy();
    expect(checkShow({ ...base, venue_id: "new", venue_name: "Room Art Space" }, { now }).values?.new_venue).toEqual({ name: "Room Art Space", address: null });
  });
  it("limits the Good to know lines", () => {
    expect(checkShow({ ...base, good_to_know: "a\nb\nc\nd\ne\nf\ng" }, { now }).errors.good_to_know).toBeTruthy();
    expect(checkShow({ ...base, good_to_know: "Free parking\n\nNo photos" }, { now }).values?.good_to_know).toEqual(["Free parking", "No photos"]);
  });
});

describe("cleanTicketUrl", () => {
  it("makes links https and refuses junk", () => {
    expect(cleanTicketUrl("tazkarti.com/event/1")).toBe("https://tazkarti.com/event/1");
    expect(cleanTicketUrl("not a link")).toBe("invalid");
    expect(cleanTicketUrl("")).toBeNull();
  });
});

describe("showZone", () => {
  it("follows the coverage zones", () => {
    expect(showZone(true, true)).toBe("local");
    expect(showZone(true, null)).toBe("local");
    expect(showZone(true, false)).toBe("inbound");
    expect(showZone(false, true)).toBe("outbound");
  });
});
