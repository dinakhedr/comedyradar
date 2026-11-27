import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { sortVenues, type VenueListItem } from "@/lib/venues-list";
import { LISTING_CACHE } from "./home";

type Raw = {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  logo_url: string | null;
  cities: { name: string; slug: string; countries: { name: string; code: string } };
};

/** Every published venue with its number of upcoming shows (public /venues page). */
export async function getVenuesListing(): Promise<VenueListItem[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows", "cities");
  const db = createPublicClient();
  if (!db) return [];
  const [venues, shows] = await Promise.all([
    db
      .from("venues")
      .select("id, name, slug, area, logo_url, cities!inner(name, slug, countries!inner(name, code))")
      .eq("status", "published")
      .limit(1000),
    db.from("v_upcoming_shows").select("venue_slug").limit(5000),
  ]);
  if (venues.error) console.error("getVenuesListing", venues.error.message);
  if (shows.error) console.error("getVenuesListing shows", shows.error.message);
  const counts = new Map<string, number>();
  for (const s of (shows.data ?? []) as { venue_slug: string | null }[]) {
    if (s.venue_slug) counts.set(s.venue_slug, (counts.get(s.venue_slug) ?? 0) + 1);
  }
  return sortVenues(
    ((venues.data ?? []) as unknown as Raw[]).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      area: r.area,
      logo_url: r.logo_url,
      city: { name: r.cities.name, slug: r.cities.slug },
      country_name: r.cities.countries.name,
      country_code: r.cities.countries.code,
      upcoming: counts.get(r.slug) ?? 0,
    })),
  );
}
