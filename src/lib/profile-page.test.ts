import { describe, expect, it } from "vitest";
import { comedianShowBadge, hasShowBetween, tourLabel } from "./profile-page";
import { podcastLinks } from "./data/comedian-links";

const base = { zone: "local" as const, status: "published", group_ids: [] as string[], performer_count: 1, starts_at: "2026-12-01T18:00:00Z" };
const groups = [{ id: "g1", name: "HighFive" }];

describe("comedianShowBadge", () => {
  it("picks the right label", () => {
    expect(comedianShowBadge({ ...base, group_ids: ["g1"] }, groups).label).toBe("With HighFive");
    expect(comedianShowBadge({ ...base, zone: "outbound" }, groups).label).toBe("On tour");
    expect(comedianShowBadge({ ...base, performer_count: 3 }, groups).label).toBe("Lineup");
    expect(comedianShowBadge(base, groups).label).toBe("Solo");
    expect(comedianShowBadge({ ...base, status: "sold_out", group_ids: ["g1"] }, groups).label).toBe("Sold out");
  });
});

describe("hasShowBetween", () => {
  it("checks the window", () => {
    expect(hasShowBetween([base], new Date("2026-12-01T00:00:00Z"), new Date("2027-01-01T00:00:00Z"))).toBe(true);
    expect(hasShowBetween([base], new Date("2027-01-01T00:00:00Z"), new Date("2027-02-01T00:00:00Z"))).toBe(false);
  });
});

describe("tourLabel", () => {
  it("solo or with group", () => {
    expect(tourLabel({ owner_type: "comedian", owner_name: "Badr" })).toBe("Solo tour");
    expect(tourLabel({ owner_type: "group", owner_name: "HighFive" })).toBe("With HighFive");
  });
});

describe("podcastLinks", () => {
  it("keeps only platforms with a link, in order", () => {
    expect(
      podcastLinks({ apple_podcasts_url: null, spotify_url: "s", anghami_url: "a", podu_url: null, youtube_url: "y" }).map((l) => l.label),
    ).toEqual(["Spotify", "Anghami", "YouTube"]);
  });
});
