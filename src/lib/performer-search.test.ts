import { describe, expect, it } from "vitest";
import { filterPerformers, normalizeName } from "./performer-search";

const list = [{ name: "Ali Kandil" }, { name: "Boosh Bshasha" }, { name: "Bassem Youssef" }, { name: "Comedy Bus" }, { name: "Éloïse Kamal" }];

describe("normalizeName", () => {
  it("drops accents, case and extra spaces", () => {
    expect(normalizeName("  Éloïse   KAMAL ")).toBe("eloise kamal");
  });
});

describe("filterPerformers", () => {
  it("returns everyone for an empty search", () => {
    expect(filterPerformers(list, "  ")).toHaveLength(list.length);
  });

  it("finds part of a name, ignoring case", () => {
    expect(filterPerformers(list, "bsha").map((p) => p.name)).toEqual(["Boosh Bshasha"]);
  });

  it("puts names starting with the text first, then a word starting with it", () => {
    expect(filterPerformers(list, "b").map((p) => p.name)).toEqual(["Bassem Youssef", "Boosh Bshasha", "Comedy Bus"]);
  });

  it("matches every typed word in any order", () => {
    expect(filterPerformers(list, "kandil ali").map((p) => p.name)).toEqual(["Ali Kandil"]);
  });

  it("ignores accents", () => {
    expect(filterPerformers(list, "eloise").map((p) => p.name)).toEqual(["Éloïse Kamal"]);
  });

  it("returns nothing when no name matches", () => {
    expect(filterPerformers(list, "zzz")).toEqual([]);
  });
});
