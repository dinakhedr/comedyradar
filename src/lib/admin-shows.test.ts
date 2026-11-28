import { describe, expect, it } from "vitest";
import { citiesSummary, groupCities, isSignal, parseIdList, periodOf, showStatusOf, showTab, ticketCheck, zoneOf } from "./admin-shows";

describe("admin shows filters", () => {
  it("falls back to safe defaults", () => {
    expect(showTab("tours")).toBe("tours");
    expect(showTab("nope")).toBe("shows");
    expect(showTab(undefined)).toBe("shows");
    expect(periodOf("past")).toBe("past");
    expect(periodOf("x")).toBe("upcoming");
    expect(zoneOf("inbound")).toBe("inbound");
    expect(zoneOf("mars")).toBe("");
    expect(showStatusOf("asked")).toBe("asked");
    expect(showStatusOf("deleted")).toBe("");
  });
  it("knows the signals", () => {
    expect(isSignal("strong")).toBe(true);
    expect(isSignal("loud")).toBe(false);
  });
  it("checks ticket links", () => {
    expect(ticketCheck(null)).toBe("missing");
    expect(ticketCheck("  ")).toBe("missing");
    expect(ticketCheck("https://tickets.example.com/a")).toBe("ok");
    expect(ticketCheck("javascript:alert(1)")).toBe("bad");
    expect(ticketCheck("ticketsmarche")).toBe("bad");
  });
});

const id = (n: number) => `20000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const CITIES = [
  { id: id(1), name: "Cairo", country_code: "EG", country: "Egypt" },
  { id: id(2), name: "Giza", country_code: "EG", country: "Egypt" },
  { id: id(3), name: "Doha", country_code: "QA", country: "Qatar" },
  { id: id(4), name: "Dubai", country_code: "AE", country: "United Arab Emirates" },
  { id: id(5), name: "Abu Dhabi", country_code: "AE", country: "United Arab Emirates" },
];

describe("cities filter", () => {
  it("reads the ?cities= list safely", () => {
    expect(parseIdList(`${id(1)},${id(2)}`)).toEqual([id(1), id(2)]);
    expect(parseIdList(`${id(1)}, nope,${id(1)}`)).toEqual([id(1)]);
    expect(parseIdList(undefined)).toEqual([]);
    expect(parseIdList(`${id(1)},${id(2)},${id(3)}`, 2)).toHaveLength(2);
  });
  it("groups cities by country in the given order", () => {
    expect(groupCities(CITIES).map((g) => [g.name, g.cities.length])).toEqual([
      ["Egypt", 2],
      ["Qatar", 1],
      ["United Arab Emirates", 2],
    ]);
  });
  it("sums up the picks", () => {
    expect(citiesSummary([], CITIES)).toBe("All cities");
    expect(citiesSummary([id(1), id(2), id(3)], CITIES)).toBe("Egypt, Qatar");
    expect(citiesSummary([id(1), id(2), id(4)], CITIES)).toBe("Egypt, Dubai");
    expect(citiesSummary([id(1)], CITIES)).toBe("Cairo");
    expect(citiesSummary([id(1), id(3), id(4)], CITIES)).toBe("Cairo + 2 more");
  });
});
