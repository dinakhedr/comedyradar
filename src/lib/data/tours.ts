import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { byCountryName } from "@/lib/countries";
import type { ListedTour, TourDateInfo } from "@/lib/tours-filters";
import { TOUR_COLUMNS } from "./group";
import { LISTING_CACHE } from "./home";
import type { TourRow } from "./types";

export type TourListItem = TourRow & ListedTour & { created_at: string; countries: string[] };
export type TourCountry = { code: string; name: string };
export type ToursListing = { tours: TourListItem[]; countries: TourCountry[] };

/** Tours have at most this many upcoming tours at a time; filtering happens on the page. */
const LIMIT = 500;

/**
 * Every tour with at least one upcoming show (spec 7.2), with its upcoming
 * dates (country, region, zone, signal) for the Where, When and badge rules.
 */
export async function getToursListing(): Promise<ToursListing> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("tours", "shows");
  const db = createPublicClient();
  if (!db) return { tours: [], countries: [] };

  const [tours, shows, countries] = await Promise.all([
    db.from("v_tours").select(`${TOUR_COLUMNS}, created_at`).not("next_show_at", "is", null).order("next_show_at").limit(LIMIT),
    db
      .from("v_upcoming_shows")
      .select("tour_id, starts_at, country_code, zone, display_signal")
      .not("tour_id", "is", null)
      .order("starts_at")
      .limit(LIMIT * 10),
    db.from("countries").select("code, name, region"),
  ]);
  if (tours.error) console.error("getToursListing", tours.error.message);

  const countryByCode = new Map(
    ((countries.data ?? []) as { code: string; name: string; region: string | null }[]).map((c) => [c.code, c]),
  );
  const datesByTour = new Map<string, TourDateInfo[]>();
  for (const s of (shows.data ?? []) as {
    tour_id: string;
    starts_at: string;
    country_code: string;
    zone: string;
    display_signal: string;
  }[]) {
    const list = datesByTour.get(s.tour_id) ?? [];
    list.push({
      starts_at: s.starts_at,
      country_code: s.country_code,
      region: countryByCode.get(s.country_code)?.region ?? null,
      zone: s.zone,
      signal: s.display_signal,
    });
    datesByTour.set(s.tour_id, list);
  }

  const items: TourListItem[] = ((tours.data ?? []) as unknown as (TourRow & { created_at: string })[]).map((t) => {
    const dates = datesByTour.get(t.id) ?? [];
    const codes = [...new Set(dates.map((d) => d.country_code))];
    return {
      ...t,
      cities: t.cities ?? [],
      dates,
      countries: codes.map((c) => countryByCode.get(c)?.name ?? c),
    };
  });

  const used = new Set(items.flatMap((t) => t.dates.map((d) => d.country_code)));
  return {
    tours: items,
    countries: [...used]
      .map((code) => ({ code, name: countryByCode.get(code)?.name ?? code }))
      .sort(byCountryName),
  };
}
