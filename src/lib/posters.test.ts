import { describe, expect, it } from "vitest";
import { hasPoster, pickPosters } from "./posters";

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
