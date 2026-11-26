import { describe, expect, it } from "vitest";
import { checkClaim, checkProfile, cleanHandle, cleanSocial, nextSlug, slugify } from "./profile-forms";

const base = {
  kind: "comedian" as const,
  name: "Badr  Nour",
  name_ar: "بدر نور",
  bio: "",
  country: "",
  socials: { instagram: "@badr.nour", tiktok: "", youtube: "", facebook: "" },
  styles: [],
  language: "",
};

describe("slugs", () => {
  it("makes readable slugs", () => {
    expect(slugify("Badr Nour")).toBe("badr-nour");
    expect(slugify("Café & Co.")).toBe("cafe-and-co");
    expect(slugify("بدر", "comedian")).toBe("comedian");
  });
  it("adds a number when taken", () => {
    expect(nextSlug("badr-nour", [])).toBe("badr-nour");
    expect(nextSlug("badr-nour", ["badr-nour", "badr-nour-2"])).toBe("badr-nour-3");
  });
});

describe("social links", () => {
  it("accepts handles and links of the right site", () => {
    expect(cleanSocial("instagram", "@badr.nour")).toBe("https://instagram.com/badr.nour");
    expect(cleanSocial("youtube", "youtube.com/@badr")).toBe("https://youtube.com/@badr");
    expect(cleanSocial("facebook", "")).toBeNull();
  });
  it("refuses other sites", () => {
    expect(cleanSocial("instagram", "https://evil.example/badr")).toBe("invalid");
    expect(cleanSocial("youtube", "@badr")).toBe("invalid");
    expect(cleanSocial("instagram", "instagram.com")).toBe("invalid");
  });
});

describe("profile form", () => {
  it("cleans the values", () => {
    const { values, errors } = checkProfile(base);
    expect(errors).toEqual({});
    expect(values?.name).toBe("Badr Nour");
    expect(values?.instagram_url).toBe("https://instagram.com/badr.nour");
    expect(values?.styles).toBeUndefined();
  });
  it("keeps group styles and language", () => {
    const { values } = checkProfile({ ...base, kind: "group", styles: ["improv", "mime"], language: "bilingual" });
    expect(values?.styles).toEqual(["improv"]);
    expect(values?.performing_language).toBe("bilingual");
  });
  it("needs an English name", () => {
    expect(checkProfile({ ...base, name: "بدر نور" }).errors.name).toBeTruthy();
  });
});

describe("claims", () => {
  const all = ["official_dm", "comedian_confirms", "document", "call"];
  it("needs the right proof for each method", () => {
    expect(checkClaim("comedian", { relation: "self", method: "official_dm", proof: "@Badr.Nour" }, all)).toEqual({
      errors: {},
      proofValue: "badr.nour",
    });
    expect(checkClaim("group", { relation: "self", method: "call", proof: "abc" }, all).errors).toHaveProperty("relation");
    expect(checkClaim("group", { relation: "member", method: "call", proof: "abc" }, all).errors).toHaveProperty("proof");
    expect(checkClaim("group", { relation: "member", method: "business_email", proof: "" }, all).errors).toHaveProperty("method");
    expect(
      checkClaim("comedian", { relation: "manager", method: "document", proof: "", file: { size: 20_000_000, type: "application/pdf" } }, all)
        .errors.file,
    ).toMatch(/10 MB/);
  });
  it("reads Instagram handles", () => {
    expect(cleanHandle("https://instagram.com/Badr.Nour/")).toBe("badr.nour");
    expect(cleanHandle("not a handle!")).toBeNull();
  });
});
