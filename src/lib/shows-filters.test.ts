import { describe, expect, it } from "vitest";
import {
  activeChips,
  countMoreFilters,
  DEFAULT_FILTERS,
  ilikeTerm,
  pageList,
  parseShowsFilters,
  showingLine,
  showsHref,
  showsWindow,
  trendingSort,
  whenLabel,
} from "./shows-filters";

describe("parseShowsFilters", () => {
  it("uses the defaults for an empty address", () => {
    expect(parseShowsFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it("reads every filter", () => {
    const f = parseShowsFilters({
      q: " ahmed ",
      when: "next",
      zone: "local",
      city: "cairo",
      group: "the-crew",
      type: "group",
      lang: "arabic",
      soldout: "hide",
      sort: "new",
      page: "3",
    });
    expect(f).toMatchObject({
      q: "ahmed",
      when: "next",
      zone: "local",
      city: "cairo",
      group: "the-crew",
      type: "group",
      lang: "arabic",
      hideSoldOut: true,
      sort: "new",
      page: 3,
    });
  });

  it("ignores unknown values", () => {
    const f = parseShowsFilters({ when: "yesterday", zone: "moon", sort: "price", page: "-2", city: "Cairo!" });
    expect(f).toMatchObject({ when: "all", zone: "all", sort: "date", page: 1, city: null });
  });

  it("keeps picked dates in order and drops them without when=dates", () => {
    expect(parseShowsFilters({ when: "dates", from: "2026-12-12", to: "2026-12-05" })).toMatchObject({
      when: "dates",
      from: "2026-12-05",
      to: "2026-12-12",
    });
    expect(parseShowsFilters({ when: "dates" }).when).toBe("all");
    expect(parseShowsFilters({ from: "2026-12-05" }).from).toBeNull();
  });

  it("uses the city of the path on /shows/city/[city]", () => {
    expect(parseShowsFilters({ city: "giza" }, { city: "alexandria" }).city).toBe("alexandria");
  });
});

describe("showsHref", () => {
  it("leaves defaults out", () => {
    expect(showsHref(DEFAULT_FILTERS)).toBe("/shows");
  });

  it("goes back to page 1 when a filter changes", () => {
    const f = { ...DEFAULT_FILTERS, page: 3, city: "cairo" };
    expect(showsHref(f, { zone: "local" })).toBe("/shows?zone=local&city=cairo");
    expect(showsHref(f, { page: 4 })).toBe("/shows?city=cairo&page=4");
  });

  it("keeps the city in the path on city pages", () => {
    const f = { ...DEFAULT_FILTERS, city: "cairo" };
    expect(showsHref(f, { sort: "new" }, "/shows/city/cairo")).toBe("/shows/city/cairo?sort=new");
  });

  it("writes picked dates", () => {
    expect(showsHref(DEFAULT_FILTERS, { when: "dates", from: "2026-12-05", to: "2026-12-12" })).toBe(
      "/shows?when=dates&from=2026-12-05&to=2026-12-12",
    );
  });
});

describe("showsWindow", () => {
  const now = new Date("2026-11-26T10:00:00Z"); // Thursday in Cairo

  it("next month covers the whole next calendar month in Cairo", () => {
    const w = showsWindow({ when: "next", from: null, to: null }, now);
    expect(w.from.toISOString()).toBe("2026-11-30T22:00:00.000Z");
    expect(w.to!.toISOString()).toBe("2026-12-31T22:00:00.000Z");
  });

  it("picked dates include the last day and never start in the past", () => {
    const w = showsWindow({ when: "dates", from: "2026-11-01", to: "2026-12-05" }, now);
    expect(w.from).toEqual(now);
    expect(w.to!.toISOString()).toBe("2026-12-05T22:00:00.000Z");
    expect(showsWindow({ when: "dates", from: "2026-12-05", to: null }, now).to).toBeNull();
  });

  it("all has no end date and is kept in the address", () => {
    expect(showsWindow({ when: "all", from: null, to: null }, now)).toEqual({ from: now, to: null });
    expect(parseShowsFilters({ when: "all" }).when).toBe("all");
    expect(showsHref(DEFAULT_FILTERS, { when: "month" })).toBe("/shows?when=month");
    expect(whenLabel({ when: "all", from: null, to: null })).toBe("All dates");
  });
});

describe("chips and counts", () => {
  it("counts the filters behind the mobile Filters button", () => {
    expect(countMoreFilters(DEFAULT_FILTERS)).toBe(0);
    expect(countMoreFilters({ ...DEFAULT_FILTERS, city: "cairo", zone: "local", hideSoldOut: true })).toBe(3);
  });

  it("lists removable chips with names", () => {
    const chips = activeChips({ ...DEFAULT_FILTERS, city: "cairo", zone: "local" }, { city: "Cairo" });
    expect(chips.map((c) => c.label)).toEqual(["Cairo", "In Egypt"]);
    expect(chips[0].remove).toEqual({ city: null });
  });
});

describe("pageList", () => {
  it("shows all pages when there are few", () => {
    expect(pageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("adds gaps", () => {
    expect(pageList(1, 12)).toEqual([1, 2, 3, 4, "…", 12]);
    expect(pageList(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageList(12, 12)).toEqual([1, "…", 9, 10, 11, 12]);
  });
});

describe("showingLine", () => {
  it("writes the range", () => {
    expect(showingLine(1, 57)).toBe("Showing 1–24 of 57 shows");
    expect(showingLine(3, 57)).toBe("Showing 49–57 of 57 shows");
    expect(showingLine(1, 1)).toBe("Showing 1–1 of 1 show");
  });
});

describe("trendingSort", () => {
  it("puts Strong Signal first and sold out last", () => {
    const s = (id: string, display_signal: string, status = "published", starts_at = "2026-12-01T18:00:00Z") => ({
      id,
      display_signal,
      status,
      starts_at,
    });
    const out = trendingSort([s("a", "none"), s("b", "strong", "sold_out"), s("c", "new"), s("d", "strong"), s("e", "fading")]);
    expect(out.map((x) => x.id)).toEqual(["d", "e", "c", "a", "b"]);
  });
});

describe("ilikeTerm", () => {
  it("removes characters that break the filter", () => {
    expect(ilikeTerm("a,b(c)")).toBe("%a b c%");
    expect(ilikeTerm("x")).toBeNull();
  });
});
