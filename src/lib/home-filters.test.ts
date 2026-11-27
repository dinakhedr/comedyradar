import { describe, expect, it } from "vitest";
import { homeWindow, parseHomeWhen } from "./home-filters";

describe("parseHomeWhen", () => {
  it("defaults to all upcoming shows, not this month", () => {
    expect(parseHomeWhen(undefined)).toBe("all");
    expect(parseHomeWhen("nonsense")).toBe("all");
  });
  it("keeps a picked chip", () => {
    expect(parseHomeWhen("month")).toBe("month");
    expect(parseHomeWhen(["weekend"])).toBe("weekend");
  });
});

describe("homeWindow", () => {
  const now = new Date("2026-11-27T20:00:00Z");
  it("all starts now and has no end, so next-month shows are included", () => {
    expect(homeWindow("all", now)).toEqual({ from: now, to: null });
  });
  it("this month still ends at the start of next month (Cairo)", () => {
    expect(homeWindow("month", now).to?.toISOString()).toBe("2026-11-30T22:00:00.000Z");
  });
});
