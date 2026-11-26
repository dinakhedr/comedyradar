import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOURS_FILTERS,
  filterTours,
  isVisitingTour,
  parseToursFilters,
  tourCounts,
  toursHref,
  toursWindowEnd,
  tourSignal,
  type ListedTour,
} from "./tours-filters";

const now = new Date("2026-11-26T10:00:00Z");
const date = (starts_at: string, country_code = "EG", region = "Egypt", zone = "local", signal = "none") => ({
  starts_at,
  country_code,
  region,
  zone,
  signal,
});
const tour = (id: string, extra: Partial<ListedTour>): ListedTour => ({
  id,
  name: `Tour ${id}`,
  owner_type: "comedian",
  owner_name: `Comic ${id}`,
  cities: ["Cairo"],
  created_at: "2026-11-01T00:00:00Z",
  next_show_at: "2026-12-10T18:00:00Z",
  show_count: 3,
  dates: [date("2026-12-10T18:00:00Z")],
  ...extra,
});

describe("parseToursFilters and toursHref", () => {
  it("uses defaults", () => {
    expect(parseToursFilters({})).toEqual(DEFAULT_TOURS_FILTERS);
    expect(toursHref(DEFAULT_TOURS_FILTERS)).toBe("/tours");
  });
  it("reads and writes every filter", () => {
    const f = parseToursFilters({ q: "dubai", who: "group", where: "gulf", country: "ae", when: "3months", sort: "dates", show: "24" });
    expect(f).toEqual({ q: "dubai", who: "group", where: "gulf", country: "AE", when: "3months", sort: "dates", show: 24 });
    expect(toursHref(f)).toBe("/tours?q=dubai&who=group&where=gulf&country=AE&when=3months&sort=dates");
    expect(toursHref(f, { show: 36 })).toContain("show=36");
  });
  it("ignores unknown values", () => {
    expect(parseToursFilters({ who: "x", where: "mars", country: "egypt", show: "-1" })).toEqual(DEFAULT_TOURS_FILTERS);
  });
});

describe("toursWindowEnd", () => {
  it("ends this month or in three months (Cairo)", () => {
    expect(toursWindowEnd("month", now)!.toISOString()).toBe("2026-11-30T22:00:00.000Z");
    expect(toursWindowEnd("3months", now)!.toISOString()).toBe("2027-02-25T22:00:00.000Z");
    expect(toursWindowEnd("any", now)).toBeNull();
  });
});

describe("filterTours", () => {
  const gulf = tour("g", {
    owner_type: "group",
    cities: ["Dubai"],
    next_show_at: "2027-01-10T18:00:00Z",
    show_count: 6,
    created_at: "2026-11-20T00:00:00Z",
    dates: [date("2027-01-10T18:00:00Z", "AE", "Gulf", "outbound")],
  });
  const local = tour("l", {});
  it("filters by performer, region, country, time and search", () => {
    const f = DEFAULT_TOURS_FILTERS;
    expect(filterTours([gulf, local], { ...f, who: "group" }, now).map((t) => t.id)).toEqual(["g"]);
    expect(filterTours([gulf, local], { ...f, where: "gulf" }, now).map((t) => t.id)).toEqual(["g"]);
    expect(filterTours([gulf, local], { ...f, country: "EG" }, now).map((t) => t.id)).toEqual(["l"]);
    expect(filterTours([gulf, local], { ...f, when: "month" }, now)).toEqual([]);
    expect(filterTours([gulf, local], { ...f, q: "dub" }, now).map((t) => t.id)).toEqual(["g"]);
  });
  it("sorts", () => {
    const f = DEFAULT_TOURS_FILTERS;
    expect(filterTours([gulf, local], f, now).map((t) => t.id)).toEqual(["l", "g"]);
    expect(filterTours([local, gulf], { ...f, sort: "new" }, now).map((t) => t.id)).toEqual(["g", "l"]);
    expect(filterTours([local, gulf], { ...f, sort: "dates" }, now).map((t) => t.id)).toEqual(["g", "l"]);
  });
});

describe("badges and counts", () => {
  it("picks the strongest signal", () => {
    expect(tourSignal([{ signal: "new" }, { signal: "fading" }])).toBe("fading");
    expect(tourSignal([{ signal: "none" }])).toBeNull();
  });
  it("spots visiting tours", () => {
    expect(isVisitingTour([{ zone: "inbound" }])).toBe(true);
    expect(isVisitingTour([{ zone: "outbound" }])).toBe(false);
  });
  it("writes the counts line", () => {
    expect(tourCounts(6, 4, "United Arab Emirates", "Dec – Feb")).toBe("6 shows · 4 countries · Dec – Feb");
    expect(tourCounts(1, 1, "Egypt", "Dec")).toBe("1 show · Egypt · Dec");
  });
});
