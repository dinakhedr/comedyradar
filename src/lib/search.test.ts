import { describe, expect, it } from "vitest";
import { groupHits, isSearchable, normalizeQuery, orderProfiles, parseTab, pickBestMatch, searchHref } from "./search";

describe("normalizeQuery", () => {
  it("trims and squashes spaces", () => {
    expect(normalizeQuery("  High   Five ")).toBe("High Five");
  });
  it("takes the first value and handles nothing", () => {
    expect(normalizeQuery(["a b", "c"])).toBe("a b");
    expect(normalizeQuery(undefined)).toBe("");
  });
  it("caps very long input", () => {
    expect(normalizeQuery("x".repeat(500))).toHaveLength(80);
  });
});

describe("isSearchable / parseTab", () => {
  it("needs two characters", () => {
    expect(isSearchable("a")).toBe(false);
    expect(isSearchable("a b")).toBe(true);
  });
  it("falls back to all", () => {
    expect(parseTab("groups")).toBe("groups");
    expect(parseTab("nope")).toBe("all");
  });
});

describe("groupHits", () => {
  it("splits by kind and keeps the best score", () => {
    const g = groupHits([
      { kind: "comedian", id: "c1", score: 0.5 },
      { kind: "comedian", id: "c1", score: 0.9 },
      { kind: "group", id: "g1", score: 1 },
    ]);
    expect(g.comedian.get("c1")).toBe(0.9);
    expect([...g.group.keys()]).toEqual(["g1"]);
    expect(g.show.size).toBe(0);
  });
});

describe("orderProfiles", () => {
  it("puts direct matches first, then related ones by name", () => {
    const items = [
      { id: "b", name: "Badr" },
      { id: "z", name: "Zed" },
      { id: "a", name: "Amr" },
    ];
    const out = orderProfiles(items, new Map([["z", 0.6]]));
    expect(out.map((i) => i.id)).toEqual(["z", "a", "b"]);
  });
});

describe("pickBestMatch", () => {
  it("prefers the group on a tie", () => {
    expect(pickBestMatch(new Map([["g", 1]]), new Map([["c", 1]]))).toEqual({ kind: "group", id: "g" });
  });
  it("picks a better comedian", () => {
    expect(pickBestMatch(new Map([["g", 0.5]]), new Map([["c", 0.9]]))).toEqual({ kind: "comedian", id: "c" });
  });
  it("returns null with no profiles", () => {
    expect(pickBestMatch(new Map(), new Map())).toBeNull();
  });
});

describe("searchHref", () => {
  it("encodes the query and tab", () => {
    expect(searchHref("high five", "groups")).toBe("/search?q=high+five&type=groups");
    expect(searchHref("x")).toBe("/search?q=x");
  });
});
