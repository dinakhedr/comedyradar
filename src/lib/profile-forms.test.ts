import { describe, expect, it } from "vitest";
import { checkClaim, checkPodcast, checkProfile, cleanHandle, cleanSocial, cleanWebsite, nextSlug, slugify } from "./profile-forms";

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

describe("checkPodcast", () => {
  const empty = { apple_podcasts_url: "", spotify_url: "", anghami_url: "", podu_url: "", youtube_url: "" };
  it("needs a name and at least one link", () => {
    expect(checkPodcast({ name: "", description: "", links: empty }).errors.name).toBeTruthy();
    expect(checkPodcast({ name: "Estry Mni", description: "", links: empty }).errors.links).toBeTruthy();
  });
  it("keeps links on the right sites only", () => {
    const ok = checkPodcast({ name: "Estry Mni", description: " ", links: { ...empty, podu_url: "podu.me/estry", spotify_url: "https://open.spotify.com/show/abc" } });
    expect(ok.values).toMatchObject({ podu_url: "https://podu.me/estry", spotify_url: "https://open.spotify.com/show/abc", description: null });
    expect(checkPodcast({ name: "Estry Mni", description: "", links: { ...empty, anghami_url: "https://evil.com/x" } }).errors.anghami_url).toBeTruthy();
  });
});

describe("group website", () => {
  it("cleans a website link", () => {
    expect(cleanWebsite("")).toBeNull();
    expect(cleanWebsite(" highfive.com ")).toBe("https://highfive.com/");
    expect(cleanWebsite("http://highfive.com/about")).toBe("http://highfive.com/about");
    expect(cleanWebsite("not a link")).toBe("invalid");
    expect(cleanWebsite("localhost")).toBe("invalid");
  });

  it("is saved for groups only", () => {
    const g = { name: "High Five", name_ar: "", bio: "", country: "", socials: { instagram: "", tiktok: "", youtube: "", facebook: "" }, styles: [], language: "" };
    expect(checkProfile({ ...g, kind: "group", website: "highfive.com" }).values?.website_url).toBe("https://highfive.com/");
    expect(checkProfile({ ...g, kind: "group", website: "nope" }).errors.website).toBeTruthy();
    expect(checkProfile({ ...g, kind: "comedian", website: "highfive.com" }).values).not.toHaveProperty("website_url");
  });
});
