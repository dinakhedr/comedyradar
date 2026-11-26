import { describe, expect, it } from "vitest";
import { itemsFor, reviewTab, waited, type ReviewItem } from "./admin-review";

const item = (type: ReviewItem["type"], id: string): ReviewItem => ({ type, id, created_at: null, title: id, sub: null, flag: null, detail: {} });

describe("review queue", () => {
  it("reads the tab safely", () => {
    expect(reviewTab("claims")).toBe("claims");
    expect(reviewTab("nope")).toBe("all");
  });
  it("filters items by tab", () => {
    const all = [item("claims", "1"), item("shows", "2")];
    expect(itemsFor("all", all)).toHaveLength(2);
    expect(itemsFor("shows", all).map((i) => i.id)).toEqual(["2"]);
    expect(itemsFor("done", all)).toEqual([]);
  });
  it("says how long an item has waited", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    expect(waited("2026-11-26T08:00:00Z", now)).toBe("today");
    expect(waited("2026-11-25T08:00:00Z", now)).toBe("1 day");
    expect(waited("2026-11-20T08:00:00Z", now)).toBe("6 days");
    expect(waited(null, now)).toBe("");
  });
});
