import { describe, expect, it } from "vitest";
import { logoChange, MAX_LOGO_BYTES, squareCrop, venueMessage, venueValues } from "./venue-forms";

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

describe("venue area", () => {
  it("trims, squeezes spaces and cuts the area to 60", () => {
    const f = new FormData();
    f.set("area", "  Sheikh   Zayed ");
    expect(venueValues(f).area).toBe("Sheikh Zayed");
    f.set("area", "a".repeat(80));
    expect(venueValues(f).area).toHaveLength(60);
  });
});

describe("logoChange", () => {
  const img = (type: string, bytes = 10) => new File([new Uint8Array(bytes)], "logo", { type });
  it("keeps the logo when nothing is picked", () => {
    expect(logoChange(new FormData()).kind).toBe("keep");
  });
  it("removes it when Remove was pressed", () => {
    const f = new FormData();
    f.set("remove_logo", "1");
    expect(logoChange(f).kind).toBe("remove");
  });
  it("uploads a JPG, PNG or WebP under the limit, even after Remove", () => {
    const f = new FormData();
    f.set("remove_logo", "1");
    f.set("logo", img("image/webp"));
    expect(logoChange(f).kind).toBe("upload");
  });
  it("refuses other files and files that are too big", () => {
    const f = new FormData();
    f.set("logo", img("application/pdf"));
    expect(logoChange(f).kind).toBe("bad");
    f.set("logo", img("image/png", MAX_LOGO_BYTES + 1));
    expect(logoChange(f).kind).toBe("bad");
  });
  it("explains a bad logo and a failed upload", () => {
    expect(venueMessage("bad_logo", "add", "Zawya", "Cairo").message).toMatch(/JPG, PNG or WebP/);
    expect(venueMessage("logo_failed", "edit", "Zawya", "Cairo").message).toBe(
      "Zawya was saved, but the logo did not upload. Please try the logo again.",
    );
  });
});

describe("squareCrop", () => {
  it("cuts the centre square of wide, tall and square pictures", () => {
    expect(squareCrop(1000, 600)).toEqual({ sx: 200, sy: 0, side: 600 });
    expect(squareCrop(400, 900)).toEqual({ sx: 0, sy: 250, side: 400 });
    expect(squareCrop(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });
});
