import { describe, expect, it } from "vitest";
import { DEFAULT_GROUPS_FILTERS, filterGroups, groupsHref, parseGroupsFilters, type ListedGroup } from "./groups-filters";

const g = (name: string, extra: Partial<ListedGroup> = {}): ListedGroup => ({
  name,
  created_at: "2026-11-01T00:00:00Z",
  member_names: [],
  next_show_at: null,
  this_month: false,
  on_tour: false,
  ...extra,
});

describe("parse and href", () => {
  it("uses defaults", () => {
    expect(parseGroupsFilters({})).toEqual(DEFAULT_GROUPS_FILTERS);
    expect(groupsHref(DEFAULT_GROUPS_FILTERS)).toBe("/groups");
  });
  it("reads and writes every filter", () => {
    const f = parseGroupsFilters({ q: "five", show: "tour", sort: "az", more: "24" });
    expect(f).toEqual({ q: "five", show: "tour", sort: "az", count: 24 });
    expect(groupsHref(f)).toBe("/groups?q=five&show=tour&sort=az");
    expect(groupsHref(f, { count: 36 })).toContain("more=36");
  });
  it("ignores unknown values", () => {
    expect(parseGroupsFilters({ show: "x", sort: "y", more: "abc" })).toEqual(DEFAULT_GROUPS_FILTERS);
  });
});

describe("filterGroups", () => {
  const list = [
    g("Zed Crew", { next_show_at: "2026-12-01T18:00:00Z", this_month: true, member_names: ["Nour Hassan"] }),
    g("HighFive", { next_show_at: "2026-12-20T18:00:00Z", on_tour: true, created_at: "2026-11-20T00:00:00Z" }),
    g("Basement", {}),
  ];
  it("filters and searches members", () => {
    const f = DEFAULT_GROUPS_FILTERS;
    expect(filterGroups(list, { ...f, show: "month" }).map((x) => x.name)).toEqual(["Zed Crew"]);
    expect(filterGroups(list, { ...f, show: "tour" }).map((x) => x.name)).toEqual(["HighFive"]);
    expect(filterGroups(list, { ...f, q: "nour" }).map((x) => x.name)).toEqual(["Zed Crew"]);
  });
  it("sorts, with no-date groups last", () => {
    const f = DEFAULT_GROUPS_FILTERS;
    expect(filterGroups(list, f).map((x) => x.name)).toEqual(["Zed Crew", "HighFive", "Basement"]);
    expect(filterGroups(list, { ...f, sort: "az" }).map((x) => x.name)).toEqual(["Basement", "HighFive", "Zed Crew"]);
    expect(filterGroups(list, { ...f, sort: "new" }).map((x) => x.name)[0]).toBe("HighFive");
  });
});
