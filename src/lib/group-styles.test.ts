import { describe, expect, it } from "vitest";
import { cleanStyles, languageMatches } from "./group-styles";

describe("group styles", () => {
  it("keeps known styles in list order", () => {
    expect(cleanStyles(["roast", "mime", "improv"])).toEqual(["improv", "roast"]);
    expect(cleanStyles(null)).toEqual([]);
  });
  it("matches languages", () => {
    expect(languageMatches(null, null)).toBe(true);
    expect(languageMatches(null, "arabic")).toBe(false);
    expect(languageMatches("bilingual", "english")).toBe(true);
    expect(languageMatches("arabic", "english")).toBe(false);
  });
});
