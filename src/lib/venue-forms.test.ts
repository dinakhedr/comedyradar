import { describe, expect, it } from "vitest";
import { venueMessage, venueValues } from "./venue-forms";

describe("venueMessage", () => {
  it("says the venue was added and published", () => {
    expect(venueMessage("ok", "add", "Room Art Space", "Cairo")).toEqual({
      ok: true,
      message: "Room Art Space added and published.",
    });
  });
  it("says an edit was saved", () => {
    expect(venueMessage("ok", "edit", " Room  Art ", "Cairo").message).toBe(
      "Room Art saved.",
    );
  });
  it("names the city when the venue already exists", () => {
    expect(venueMessage("exists", "add", "Room Art Space", "Cairo")).toEqual({
      ok: false,
      message: "Cairo already has a venue called Room Art Space.",
    });
  });
  it("explains bad values and unknown errors", () => {
    expect(venueMessage("bad_value", "add", "x", "Cairo").message).toMatch(
      /Google Maps link/,
    );
    expect(venueMessage("forbidden", "edit", "x", "Cairo").message).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("venueValues", () => {
  it("trims and cuts the typed values", () => {
    const f = new FormData();
    f.set("name", "  Zawya  ");
    f.set("website", "x".repeat(600));
    const v = venueValues(f);
    expect(v.name).toBe("Zawya");
    expect(v.website).toHaveLength(500);
    expect(v.address).toBe("");
  });
});
