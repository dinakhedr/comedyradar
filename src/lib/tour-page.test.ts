import { describe, expect, it } from "vitest";
import { countryCounts, dateTile, shortDate, splitDates, tourStats, tourZoneLabel } from "./tour-page";

const d = (starts_at: string, country_code = "AE", country_name = "UAE", status = "published", zone: "local" | "outbound" | "inbound" = "outbound") => ({
  starts_at,
  country_code,
  country_name,
  status,
  zone,
});

const dates = [
  d("2026-12-05T17:00:00Z"),
  d("2026-11-20T17:00:00Z", "AE"),
  d("2027-01-10T17:00:00Z", "SA", "Saudi Arabia"),
  d("2026-12-12T17:00:00Z", "QA", "Qatar", "cancelled"),
];

describe("splitDates", () => {
  it("splits on now and orders each side", () => {
    const { upcoming, past } = splitDates(dates, new Date("2026-11-26T00:00:00Z"));
    expect(upcoming.map((x) => x.starts_at.slice(0, 10))).toEqual(["2026-12-05", "2026-12-12", "2027-01-10"]);
    expect(past.map((x) => x.starts_at.slice(0, 10))).toEqual(["2026-11-20"]);
  });
});

describe("tourStats", () => {
  it("ignores cancelled dates and spans years", () => {
    expect(tourStats(dates)).toEqual({ shows: 3, countries: 2, months: "Nov – Jan", year: "2026 – 2027" });
  });
  it("handles no dates", () => {
    expect(tourStats([])).toEqual({ shows: 0, countries: 0, months: null, year: null });
  });
});

describe("countryCounts", () => {
  it("counts per country in first-seen order", () => {
    expect(countryCounts(dates)).toEqual([
      { code: "AE", name: "UAE", count: 2 },
      { code: "SA", name: "Saudi Arabia", count: 1 },
      { code: "QA", name: "Qatar", count: 1 },
    ]);
  });
});

describe("labels", () => {
  it("zone label follows most dates", () => {
    expect(tourZoneLabel(dates)).toBe("On tour abroad");
    expect(tourZoneLabel([d("2026-12-01T00:00:00Z", "EG", "Egypt", "published", "local")])).toBe("In Egypt");
    expect(tourZoneLabel([])).toBeNull();
  });
  it("date tile and short date in Cairo time", () => {
    expect(dateTile("2026-11-27T18:00:00Z")).toEqual({ day: "27", month: "NOV", line: "Fri · 8:00 PM" });
    expect(shortDate("2026-11-30T22:30:00Z")).toBe("1 Dec");
  });
});
