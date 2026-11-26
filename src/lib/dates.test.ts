import { describe, expect, it } from "vitest";
import { cairoMidnight, formatMonthRange, formatShowDateLine, parseWhen, whenRange } from "./dates";

describe("parseWhen", () => {
  it("defaults to this month", () => {
    expect(parseWhen(undefined)).toBe("month");
    expect(parseWhen("nonsense")).toBe("month");
    expect(parseWhen(["tonight"])).toBe("tonight");
  });
});

describe("cairoMidnight", () => {
  it("handles winter time (UTC+2)", () => {
    expect(cairoMidnight(2026, 12, 1).toISOString()).toBe("2026-11-30T22:00:00.000Z");
  });
  it("handles summer time (UTC+3)", () => {
    expect(cairoMidnight(2026, 7, 15).toISOString()).toBe("2026-07-14T21:00:00.000Z");
  });
});

describe("whenRange", () => {
  // Thursday 26 Nov 2026, 02:27 in Cairo
  const thu = new Date("2026-11-26T00:27:00Z");

  it("tonight ends at Cairo midnight", () => {
    const r = whenRange("tonight", thu);
    expect(r.from).toEqual(thu);
    expect(r.to.toISOString()).toBe("2026-11-26T22:00:00.000Z");
  });

  it("this weekend is Friday and Saturday", () => {
    const r = whenRange("weekend", thu);
    expect(r.from.toISOString()).toBe("2026-11-26T22:00:00.000Z"); // Fri 27 Nov 00:00 Cairo
    expect(r.to.toISOString()).toBe("2026-11-28T22:00:00.000Z"); // Sun 29 Nov 00:00 Cairo
  });

  it("during the weekend it starts now", () => {
    const sat = new Date("2026-11-28T18:00:00Z");
    const r = whenRange("weekend", sat);
    expect(r.from).toEqual(sat);
    expect(r.to.toISOString()).toBe("2026-11-28T22:00:00.000Z");
  });

  it("this month ends at the start of next month", () => {
    expect(whenRange("month", thu).to.toISOString()).toBe("2026-11-30T22:00:00.000Z");
    const dec = new Date("2026-12-10T10:00:00Z");
    expect(whenRange("month", dec).to.toISOString()).toBe("2026-12-31T22:00:00.000Z");
  });
});

describe("formatShowDateLine", () => {
  const now = new Date("2026-11-26T10:00:00Z"); // Thu 12:00 Cairo
  it("says TONIGHT for today", () => {
    expect(formatShowDateLine(new Date("2026-11-26T18:30:00Z"), now)).toBe("TONIGHT · 8:30 PM");
  });
  it("says TOMORROW for tomorrow", () => {
    expect(formatShowDateLine(new Date("2026-11-27T19:00:00Z"), now)).toBe("TOMORROW · 9:00 PM");
  });
  it("uses weekday and date later", () => {
    expect(formatShowDateLine(new Date("2026-11-28T19:00:00Z"), now)).toBe("SAT 28 NOV · 9:00 PM");
  });
});

describe("formatMonthRange", () => {
  it("shows one month or a range", () => {
    expect(formatMonthRange(new Date("2026-12-01T18:00:00Z"), new Date("2026-12-20T18:00:00Z"))).toBe("Dec");
    expect(formatMonthRange(new Date("2026-12-01T18:00:00Z"), new Date("2027-02-20T18:00:00Z"))).toBe("Dec – Feb");
  });
});
