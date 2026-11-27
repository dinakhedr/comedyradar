import { describe, expect, it } from "vitest";
import { cityChips, filterVenues, sortVenues, type VenueListItem } from "./venues-list";

const v = (name: string, city: string, upcoming: number): VenueListItem => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  area: null,
  logo_url: null,
  city: { name: city, slug: city.toLowerCase() },
  country_name: "Egypt",
  country_code: "EG",
  upcoming,
});

const list = [v("Zawya", "Cairo", 0), v("Arkan", "Giza", 3), v("Room", "Cairo", 2), v("Bayt", "Cairo", 0), v("Jazz", "Cairo", 3)];

describe("venues list", () => {
  it("puts venues with shows first, most shows first, then A to Z", () => {
    expect(sortVenues(list).map((x) => x.name)).toEqual(["Arkan", "Jazz", "Room", "Bayt", "Zawya"]);
  });
  it("makes one chip per city, biggest first", () => {
    expect(cityChips(list)).toEqual([
      { slug: "cairo", name: "Cairo", count: 4 },
      { slug: "giza", name: "Giza", count: 1 },
    ]);
  });
  it("filters by city and ignores unknown cities", () => {
    expect(filterVenues(list, "giza").map((x) => x.name)).toEqual(["Arkan"]);
    expect(filterVenues(list, "nowhere")).toHaveLength(5);
    expect(filterVenues(list, "")).toHaveLength(5);
  });
});
