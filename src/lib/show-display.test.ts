import { describe, expect, it } from "vitest";
import type { ShowRow } from "@/lib/data/types";
import { cardBadge, countryLabel, placeBadge } from "./show-display";

const show = (over: Partial<ShowRow> = {}): ShowRow => ({
  id: "1", slug: "s", title: "T", starts_at: "2026-12-01T18:00:00Z", status: "published", zone: "local",
  display_signal: "none", ticket_url: null, poster_url: null, tour_id: null, city_name: "Cairo", city_slug: "cairo",
  country_code: "EG", venue_name: null, headliner_type: "comedian", headliner_name: "A", headliner_slug: "a",
  headliner_photo_url: null, comedian_ids: [], group_ids: [], performer_count: 1, ...over,
});

describe("card pills", () => {
  it("shows the signal for shows in Egypt", () => {
    expect(cardBadge(show({ display_signal: "new" }))).toEqual({ label: "New", tone: "yellow", icon: "new" });
    expect(cardBadge(show({ display_signal: "strong" }))?.label).toBe("Strong");
    expect(cardBadge(show())).toBeNull();
  });
  it("shows the country in place of the signal outside Egypt", () => {
    expect(cardBadge(show({ country_code: "AE", display_signal: "new" }))).toEqual({ label: "UAE", tone: "white", icon: "place" });
    expect(cardBadge(show({ country_code: "SA", status: "sold_out" }))?.label).toBe("Saudi Arabia");
    expect(placeBadge(show())).toBeNull();
  });
  it("uses short country names", () => {
    expect(countryLabel("gb")).toBe("UK");
    expect(countryLabel("JO")).toBe("Jordan");
  });
});
