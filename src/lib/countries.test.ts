import { describe, expect, it } from "vitest";
import { byCountryName, countriesOf, flagOf, parseCountry } from "./countries";

describe("countries", () => {
  it("turns a code into a flag", () => {
    expect(flagOf("EG")).toBe("🇪🇬");
    expect(flagOf("ae")).toBe("🇦🇪");
    expect(flagOf("EGY")).toBe("");
  });
  it("reads the country from the address; Egypt is the default", () => {
    expect(parseCountry("ae")).toBe("AE");
    expect(parseCountry("EG")).toBeNull();
    expect(parseCountry("x1")).toBeNull();
    expect(parseCountry(undefined)).toBeNull();
  });
  it("lists each country once, by name", () => {
    const list = countriesOf([
      { country_code: "EG", country_name: "Egypt" },
      { country_code: "AE", country_name: "United Arab Emirates" },
      { country_code: "EG", country_name: "Egypt" },
    ]);
    expect(list).toEqual([{ code: "EG", name: "Egypt" }, { code: "AE", name: "United Arab Emirates" }]);
  });
  it("puts Egypt first, then the rest A to Z", () => {
    const list = [
      { code: "SD", name: "Sudan" },
      { code: "BH", name: "Bahrain" },
      { code: "EG", name: "Egypt" },
      { code: "FR", name: "France" },
      { code: "AE", name: "United Arab Emirates" },
    ].sort(byCountryName);
    expect(list.map((c) => c.code)).toEqual(["EG", "BH", "FR", "SD", "AE"]);
  });
  it("keeps Egypt first in the header menu even after A-names", () => {
    const list = countriesOf([
      { country_code: "BH", country_name: "Bahrain" },
      { country_code: "EG", country_name: "Egypt" },
    ]);
    expect(list.map((c) => c.code)).toEqual(["EG", "BH"]);
  });
});
