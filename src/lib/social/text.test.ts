import { describe, expect, it } from "vitest";
import { cleanFirstName, estimateWidth, featureFileName, fitFontSize, possessive, splitName } from "./text";
import { featureLayout } from "./comedian-feature";

describe("splitName", () => {
  it("takes the first word, the rest is the last name", () => {
    expect(splitName("Taha Desouky")).toEqual({ first: "Taha", last: "Desouky" });
    expect(splitName("  Mohamed  Abdel Rahman El Sayed ")).toEqual({ first: "Mohamed", last: "Abdel Rahman El Sayed" });
    expect(splitName("Cardi")).toEqual({ first: "Cardi", last: "" });
  });
  it("uses the first name override when given", () => {
    expect(splitName("Mohamed Abdel Rahman", "Hamo")).toEqual({ first: "Hamo", last: "Abdel Rahman" });
    expect(splitName("Taha Desouky", "   ")).toEqual({ first: "Taha", last: "Desouky" });
  });
});

describe("possessive", () => {
  it("adds 's, or only ' after an s", () => {
    expect(possessive("Taha")).toBe("Taha's");
    expect(possessive("Abbas")).toBe("Abbas'");
    expect(possessive("ABBAS")).toBe("ABBAS'");
  });
});

describe("fitFontSize", () => {
  it("keeps the biggest size when everything fits", () => {
    expect(fitFontSize(["Taha", "Desouky"], 104, 72, 936)).toBe(104);
  });
  it("shrinks both lines for a long line, never below the minimum", () => {
    const size = fitFontSize(["Ahmed", "Abdelrahman Elsayed"], 104, 72, 936);
    expect(size).toBeLessThan(104);
    expect(size).toBeGreaterThanOrEqual(72);
    expect(estimateWidth("Abdelrahman Elsayed", size)).toBeLessThanOrEqual(936);
    expect(fitFontSize(["Mohamed", "Abdel Rahman El Sayed Mostafa"], 104, 72, 936)).toBe(72);
  });
});

describe("featureLayout", () => {
  it("builds the CTA and shrinks a long first line", () => {
    expect(featureLayout("Taha Desouky").ctaLine1).toBe("Find Taha's shows");
    expect(featureLayout("Abbas Ahmed").ctaLine1).toBe("Find Abbas' shows");
    expect(featureLayout("Taha Desouky").ctaSize).toBe(58);
    const long = featureLayout("Abdelrahmanelsayed Ali");
    expect(long.ctaSize).toBeLessThan(58);
    expect(long.ctaSize).toBeGreaterThanOrEqual(44);
  });
});

describe("cleanFirstName and featureFileName", () => {
  it("cleans input", () => {
    expect(cleanFirstName(" Ta\nha ")).toBe("Ta ha");
    expect(cleanFirstName(null)).toBe("");
    expect(cleanFirstName("x".repeat(60))).toHaveLength(40);
    expect(featureFileName("taha-desouky")).toBe("comedy-radar-taha-desouky-feature.png");
    expect(featureFileName('a"b/c')).toBe("comedy-radar-a-b-c-feature.png");
  });
});
