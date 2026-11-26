import { describe, expect, it } from "vitest";
import {
  cairoInputToIso,
  intIn,
  isCurrency,
  isoToCairoInput,
} from "./admin-spotlight";

describe("admin spotlight", () => {
  it("reads datetime fields as Cairo time", () => {
    // December: Cairo is UTC+2.
    expect(cairoInputToIso("2026-12-05T20:30")).toBe(
      "2026-12-05T18:30:00.000Z",
    );
    // July: summer time, UTC+3.
    expect(cairoInputToIso("2026-07-10T21:00")).toBe(
      "2026-07-10T18:00:00.000Z",
    );
    expect(cairoInputToIso("")).toBeNull();
    expect(cairoInputToIso("tomorrow")).toBeNull();
  });
  it("fills datetime fields in Cairo time", () => {
    expect(isoToCairoInput("2026-12-05T18:30:00.000Z")).toBe(
      "2026-12-05T20:30",
    );
    expect(isoToCairoInput(null)).toBe("");
  });
  it("checks numbers and currencies", () => {
    expect(intIn("3", 1, 5, null)).toBe(3);
    expect(intIn("9", 1, 5, null)).toBeNull();
    expect(intIn("abc", 0, 100, 0)).toBe(0);
    expect(isCurrency("EGP")).toBe(true);
    expect(isCurrency("BTC")).toBe(false);
  });
});
