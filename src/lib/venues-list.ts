/** Public venues list (/venues): pure helpers so the order and filter can be tested. */

export type VenueListItem = {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  logo_url: string | null;
  city: { name: string; slug: string };
  country_name: string;
  upcoming: number;
};

export type CityChip = { slug: string; name: string; count: number };

/** Venues with shows coming up first (most shows first), then A to Z. */
export function sortVenues(list: VenueListItem[]): VenueListItem[] {
  return [...list].sort(
    (a, b) => Number(b.upcoming > 0) - Number(a.upcoming > 0) || b.upcoming - a.upcoming || a.name.localeCompare(b.name),
  );
}

/** One chip per city that has venues, biggest first, then A to Z. */
export function cityChips(list: VenueListItem[]): CityChip[] {
  const by = new Map<string, CityChip>();
  for (const v of list) {
    const c = by.get(v.city.slug) ?? { slug: v.city.slug, name: v.city.name, count: 0 };
    c.count++;
    by.set(v.city.slug, c);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** The venues of one city, or all when the city is empty or unknown. */
export function filterVenues(list: VenueListItem[], city: string): VenueListItem[] {
  if (!city || !list.some((v) => v.city.slug === city)) return list;
  return list.filter((v) => v.city.slug === city);
}
