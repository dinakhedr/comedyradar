import { describe, expect, it } from "vitest";
import {
  comediansHref,
  DEFAULT_COMEDIANS_FILTERS,
  filterComedians,
  nameLetter,
  parseComediansFilters,
  type ListedComedian,
} from "./comedians-filters";

const c = (name: string, extra: Partial<ListedComedian> = {}): ListedComedian => ({
  name,
  created_at: "2026-11-01T00:00:00Z",
  country_code: "EG",
  upcoming_count: 0,
  this_month: false,
  on_tour: false,
  has_podcast: false,
  groups: [],
  ...extra,
});

describe("parse and href", () => {
  it("uses defaults", () => {
    expect(parseComediansFilters({})).toEqual(DEFAULT_COMEDIANS_FILTERS);
    expect(comediansHref(DEFAULT_COMEDIANS_FILTERS)).toBe("/comedians");
  });
  it("reads and writes every filter", () => {
    const f = parseComediansFilters({ q: "nour", show: "podcast", from: "eg", letter: "n", sort: "az", page: "2" });
    expect(f).toEqual({ q: "nour", show: "podcast", from: "EG", letter: "N", sort: "az", page: 2 });
    expect(comediansHref(f)).toBe("/comedians?q=nour&show=podcast&from=EG&letter=N&sort=az");
    expect(comediansHref(f, { page: 3 })).toContain("page=3");
  });
  it("ignores unknown values", () => {
    expect(parseComediansFilters({ show: "x", letter: "ab", from: "Egypt", sort: "y" })).toEqual(DEFAULT_COMEDIANS_FILTERS);
  });
});

describe("filterComedians", () => {
  const list = [
    c("Nour", { upcoming_count: 2, has_podcast: true, created_at: "2026-11-20T00:00:00Z" }),
    c("Ahmed", { upcoming_count: 5, groups: [{}], on_tour: true }),
    c("Sam", { country_code: "GB", this_month: true }),
  ];
  it("filters", () => {
    const f = DEFAULT_COMEDIANS_FILTERS;
    expect(filterComedians(list, { ...f, show: "podcast" }).map((x) => x.name)).toEqual(["Nour"]);
    expect(filterComedians(list, { ...f, show: "group" }).map((x) => x.name)).toEqual(["Ahmed"]);
    expect(filterComedians(list, { ...f, show: "tour" }).map((x) => x.name)).toEqual(["Ahmed"]);
    expect(filterComedians(list, { ...f, show: "month" }).map((x) => x.name)).toEqual(["Sam"]);
    expect(filterComedians(list, { ...f, from: "GB" }).map((x) => x.name)).toEqual(["Sam"]);
    expect(filterComedians(list, { ...f, letter: "N" }).map((x) => x.name)).toEqual(["Nour"]);
    expect(filterComedians(list, { ...f, q: "hme" }).map((x) => x.name)).toEqual(["Ahmed"]);
  });
  it("sorts", () => {
    const f = DEFAULT_COMEDIANS_FILTERS;
    expect(filterComedians(list, f).map((x) => x.name)).toEqual(["Ahmed", "Nour", "Sam"]);
    expect(filterComedians(list, { ...f, sort: "az" }).map((x) => x.name)).toEqual(["Ahmed", "Nour", "Sam"]);
    expect(filterComedians(list, { ...f, sort: "new" }).map((x) => x.name)).toEqual(["Nour", "Ahmed", "Sam"]);
  });
  it("finds the first letter", () => {
    expect(nameLetter(" omar")).toBe("O");
    expect(nameLetter("3arabi")).toBe("#");
  });
});
