import { describe, expect, it } from "vitest";
import { buildSpotlight } from "./spotlight";

const show = (id: string, day: number, signal = "none") => ({
  id,
  starts_at: `2026-11-${String(day).padStart(2, "0")}T18:00:00Z`,
  display_signal: signal,
});
const monthEnd = new Date("2026-11-30T22:00:00Z");
type S = ReturnType<typeof show>;
const none: S[] = [];

describe("buildSpotlight", () => {
  it("is empty when there are no shows", () => {
    expect(buildSpotlight({ placements: [], upcoming: none, monthEnd, slots: 5 })).toEqual([]);
  });

  it("orders placements by priority then date", () => {
    const slides = buildSpotlight({
      placements: [
        { ...show("a", 29), priority: 0 },
        { ...show("b", 28), priority: 5 },
        { ...show("c", 27), priority: 0 },
      ],
      upcoming: none,
      monthEnd,
      slots: 5,
    });
    expect(slides.map((s) => s.show.id)).toEqual(["b", "c", "a"]);
  });

  it("fills with strong shows this month, then the soonest shows, without duplicates", () => {
    const upcoming = [
      show("p", 27),
      show("s1", 29, "strong"),
      show("x", 27),
      show("s-next-month", 30, "strong"),
      show("y", 28),
    ];
    // s-next-month starts on 30 Nov 18:00 UTC = before month end, so it counts as this month.
    const slides = buildSpotlight({
      placements: [{ ...show("p", 27), priority: 1 }],
      upcoming,
      monthEnd,
      slots: 4,
    });
    expect(slides.map((s) => [s.show.id, s.source])).toEqual([
      ["p", "placement"],
      ["s1", "strong"],
      ["s-next-month", "strong"],
      ["x", "soonest"],
    ]);
  });

  it("ignores strong shows after this month for the strong step", () => {
    const later = { id: "dec", starts_at: "2026-12-05T18:00:00Z", display_signal: "strong" };
    const slides = buildSpotlight({ placements: [], upcoming: [later, show("n", 28)], monthEnd, slots: 5 });
    expect(slides.map((s) => [s.show.id, s.source])).toEqual([
      ["n", "soonest"],
      ["dec", "soonest"],
    ]);
  });
});
