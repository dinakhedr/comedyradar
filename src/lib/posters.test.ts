import { describe, expect, it } from "vitest";
import { hasPoster, pickPosters, posterFits, shrinkTo } from "./posters";

describe("pickPosters", () => {
  it("uses each poster in its place when both are there", () => {
    expect(pickPosters({ poster_url: "w", poster_tall_url: "t" })).toEqual({ wide: "w", tall: "t" });
  });
  it("uses the only poster for both", () => {
    expect(pickPosters({ poster_url: "w", poster_tall_url: null })).toEqual({ wide: "w", tall: "w" });
    expect(pickPosters({ poster_url: null, poster_tall_url: "t" })).toEqual({ wide: "t", tall: "t" });
  });
  it("gives nothing when there is no poster", () => {
    expect(pickPosters({ poster_url: null, poster_tall_url: null })).toEqual({ wide: null, tall: null });
    expect(pickPosters(null)).toEqual({ wide: null, tall: null });
  });
  it("a tour date without its own posters uses the tour's", () => {
    expect(pickPosters({ poster_url: null, poster_tall_url: null }, { poster_url: "tw", poster_tall_url: "tt" })).toEqual({ wide: "tw", tall: "tt" });
  });
  it("a tour date with any poster of its own keeps its own", () => {
    expect(pickPosters({ poster_url: "w", poster_tall_url: null }, { poster_url: "tw", poster_tall_url: "tt" })).toEqual({ wide: "w", tall: "w" });
    expect(pickPosters({ poster_url: null, poster_tall_url: "t" }, { poster_url: "tw", poster_tall_url: null })).toEqual({ wide: "t", tall: "t" });
  });
  it("treats blank addresses as no poster", () => {
    expect(pickPosters({ poster_url: " ", poster_tall_url: "" }, { poster_url: "tw" })).toEqual({ wide: "tw", tall: "tw" });
    expect(hasPoster({ poster_url: "", poster_tall_url: null })).toBe(false);
    expect(hasPoster({ poster_tall_url: "t" })).toBe(true);
  });
});

describe("shrinkTo", () => {
  it("keeps small posters as they are", () => {
    expect(shrinkTo(1920, 1080, 500_000)).toBeNull();
    expect(shrinkTo(1080, 1350, 220_000)).toBeNull();
  });
  it("shrinks big posters to 2000 px on the long side", () => {
    expect(shrinkTo(4000, 2250, 3_000_000)).toEqual({ width: 2000, height: 1125 });
    expect(shrinkTo(2160, 2700, 2_000_000)).toEqual({ width: 1600, height: 2000 });
  });
  it("re-saves a heavy file even when its size in pixels is fine", () => {
    expect(shrinkTo(1920, 1080, 2_500_000)).toEqual({ width: 1920, height: 1080 });
  });
});

describe("posterFits", () => {
  it("wide posters fill the box", () => {
    expect(posterFits(1920, 1080)).toBe(true);
    expect(posterFits(1024, 510)).toBe(true);
  });
  it("tall and square posters are shown whole", () => {
    expect(posterFits(1080, 1350)).toBe(false);
    expect(posterFits(1080, 1080)).toBe(false);
    expect(posterFits(100, 0)).toBe(false);
  });
});
