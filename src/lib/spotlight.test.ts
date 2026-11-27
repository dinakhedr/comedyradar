import { describe, expect, it } from "vitest";
import { buildSpotlight } from "./spotlight";

const show = (id: string, day: number) => ({
  id,
  starts_at: `2026-11-${String(day).padStart(2, "0")}T18:00:00Z`,
});

describe("buildSpotlight", () => {
  it("is empty when nothing is picked, even if shows exist", () => {
    expect(buildSpotlight({ placements: [], slots: 5 })).toEqual([]);
  });

  it("orders placements by priority then date", () => {
    const slides = buildSpotlight({
      placements: [
        { ...show("a", 29), priority: 0 },
        { ...show("b", 28), priority: 5 },
        { ...show("c", 27), priority: 0 },
      ],
      slots: 5,
    });
    expect(slides.map((s) => s.show.id)).toEqual(["b", "c", "a"]);
    expect(slides.every((s) => s.source === "placement")).toBe(true);
  });

  it("keeps at most the number of slides and no show twice", () => {
    const slides = buildSpotlight({
      placements: [
        { ...show("a", 27), priority: 3 },
        { ...show("a", 27), priority: 1 },
        { ...show("b", 28), priority: 2 },
        { ...show("c", 29), priority: 1 },
      ],
      slots: 2,
    });
    expect(slides.map((s) => s.show.id)).toEqual(["a", "b"]);
  });
});
