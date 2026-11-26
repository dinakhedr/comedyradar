import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { LISTING_CACHE, SHOW_COLUMNS } from "./home";
import type { ShowRow } from "./types";

export type PastShow = { slug: string; title: string; starts_at: string };

export type VenueDetail = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  address: string | null;
  area: string | null;
  logo_url: string | null;
  map_url: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  city: { name: string; slug: string; country_name: string; country_code: string };
  shows: ShowRow[];
  past: PastShow[];
};

type Raw = Omit<VenueDetail, "city" | "shows" | "past"> & {
  cities: { name: string; slug: string; countries: { name: string; code: string } };
};

/** One published venue with its upcoming shows and its most recent past shows. */
export async function getVenue(slug: string): Promise<VenueDetail | null> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows", "cities", `venue:${slug}`);
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db
    .from("venues")
    .select(
      "id, name, name_ar, slug, address, area, logo_url, map_url, website, instagram_url, facebook_url, cities!inner(name, slug, countries!inner(name, code))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) console.error("getVenue", error.message);
  if (!data) return null;
  const { cities, ...v } = data as unknown as Raw;

  const [upcoming, past] = await Promise.all([
    db.from("v_upcoming_shows").select(SHOW_COLUMNS).eq("venue_slug", slug).order("starts_at").limit(60),
    db
      .from("shows")
      .select("slug, title, starts_at")
      .eq("venue_id", v.id)
      .in("status", ["published", "sold_out"])
      .lt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(12),
  ]);
  if (upcoming.error) console.error("getVenue shows", upcoming.error.message);
  return {
    ...v,
    city: { name: cities.name, slug: cities.slug, country_name: cities.countries.name, country_code: cities.countries.code },
    shows: (upcoming.data ?? []) as unknown as ShowRow[],
    past: (past.data ?? []) as PastShow[],
  };
}
