import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { homeWindow, type HomeWhen } from "@/lib/home-filters";
import { buildSpotlight, type SpotlightSlide } from "@/lib/spotlight";
import type { City, ShowRow, TourRow, TrackItem } from "./types";

// Listing data revalidates every 10 minutes (spec section 12).
export const LISTING_CACHE = { stale: 60, revalidate: 600, expire: 3600 };

export const SHOW_COLUMNS =
  "id, slug, title, starts_at, status, zone, display_signal, ticket_url, poster_url, tour_id, " +
  "city_name, city_slug, country_code, venue_name, headliner_type, headliner_name, headliner_slug, " +
  "headliner_photo_url, comedian_ids, group_ids, performer_count";

export type HomeSettings = {
  spotlightSlides: number;
  spotlightAutoadvanceSeconds: number;
  comingUpCount: number;
  trackCount: number;
  toursCount: number;
  defaultCity: string;
};

const DEFAULT_SETTINGS: HomeSettings = {
  spotlightSlides: 5,
  spotlightAutoadvanceSeconds: 6,
  comingUpCount: 8,
  trackCount: 6,
  toursCount: 4,
  defaultCity: "cairo",
};

export async function getHomeSettings(): Promise<HomeSettings> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("site-settings");
  const db = createPublicClient();
  if (!db) return DEFAULT_SETTINGS;
  const { data } = await db.from("site_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  const num = (k: string, d: number) => {
    const v = Number(map.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  return {
    spotlightSlides: Math.min(num("spotlight_slides", 5), 5),
    spotlightAutoadvanceSeconds: num("spotlight_autoadvance_s", 6),
    comingUpCount: num("coming_up_count", 8),
    trackCount: num("track_count", 6),
    toursCount: num("tours_count", 4),
    defaultCity: typeof map.get("default_city") === "string" ? (map.get("default_city") as string) : "cairo",
  };
}

export async function getCities(): Promise<City[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("cities");
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db
    .from("cities")
    .select("id, name, slug, countries!inner(code, name, is_market)")
    .order("name");
  return (data ?? []).map((c) => {
    const country = c.countries as unknown as { code: string; name: string };
    return { id: c.id, name: c.name, slug: c.slug, country_code: country.code, country_name: country.name };
  });
}

/** Coming up: the next N published shows for the hero filters, soonest first. */
export async function getComingUp(when: HomeWhen, city: string | null, limit: number, country: string | null = null): Promise<ShowRow[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows");
  const db = createPublicClient();
  if (!db) return [];
  // No chip picked: the next shows whatever their date (no "this month" limit).
  const { from, to } = homeWindow(when, new Date());
  let q = db
    .from("v_upcoming_shows")
    .select(SHOW_COLUMNS)
    .gte("starts_at", from.toISOString())
    // Only shows left on the homepage (house icon in Admin > Shows and tours).
    .eq("on_homepage", true);
  if (to) q = q.lt("starts_at", to.toISOString());
  if (city) q = q.eq("city_slug", city);
  else if (country) q = q.eq("country_code", country);
  const { data, error } = await q.order("starts_at").limit(limit);
  if (error) console.error("getComingUp", error.message);
  return (data ?? []) as unknown as ShowRow[];
}

/** Spotlight slides: active placements, then the fallback (section 9). */
export async function getSpotlight(slots: number): Promise<SpotlightSlide<ShowRow>[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows", "spotlight");
  const db = createPublicClient();
  if (!db) return [];
  // Only the shows picked in Admin > Spotlight. No automatic fill.
  const placements = await db.from("v_spotlight").select(`priority, is_paid, ${SHOW_COLUMNS}`).limit(slots);
  if (placements.error) console.error("getSpotlight", placements.error.message);
  return buildSpotlight({
    placements: (placements.data ?? []) as unknown as (ShowRow & { priority: number })[],
    slots,
  });
}

/** On tour: tours with at least one upcoming show, by next show date. */
export async function getActiveTours(limit = 4): Promise<TourRow[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("tours");
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("v_tours")
    .select(
      "id, slug, name, poster_url, owner_type, owner_name, owner_slug, owner_photo_url, first_show_at, " +
        "last_show_at, next_show_at, show_count, country_count, cities",
    )
    .order("next_show_at")
    .limit(limit);
  if (error) console.error("getActiveTours", error.message);
  return (data ?? []) as unknown as TourRow[];
}

/**
 * Comedians to track: a mix of comedians and groups, the ones with the most
 * upcoming shows first, then the newest profiles.
 */
export async function getTrackItems(limit: number): Promise<TrackItem[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("profiles", "shows");
  const db = createPublicClient();
  if (!db) return [];

  const [comedians, groups, shows, tours] = await Promise.all([
    db.from("comedians").select("id, name, slug, photo_url, created_at").eq("status", "published")
      .order("created_at", { ascending: false }).limit(60),
    db.from("comedy_groups").select("id, name, slug, photo_url, created_at, group_members(comedian_id, left_on, link_status)")
      .eq("status", "published").order("created_at", { ascending: false }).limit(30),
    db.from("v_upcoming_shows").select("comedian_ids, group_ids").limit(500),
    db.from("v_tours").select("owner_type, owner_id").limit(100),
  ]);

  const counts = new Map<string, number>();
  for (const s of (shows.data ?? []) as { comedian_ids: string[]; group_ids: string[] }[]) {
    for (const id of [...(s.comedian_ids ?? []), ...(s.group_ids ?? [])]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const touring = new Set(((tours.data ?? []) as { owner_id: string }[]).map((t) => t.owner_id));

  const items: TrackItem[] = [
    ...(comedians.data ?? []).map((c) => ({
      kind: "comedian" as const,
      id: c.id,
      name: c.name,
      slug: c.slug,
      photo_url: c.photo_url,
      member_count: 0,
      upcoming_count: counts.get(c.id) ?? 0,
      on_tour: touring.has(c.id),
      created_at: c.created_at,
    })),
    ...(groups.data ?? []).map((g) => {
      const members = (g.group_members ?? []) as { left_on: string | null; link_status: string }[];
      return {
        kind: "group" as const,
        id: g.id,
        name: g.name,
        slug: g.slug,
        photo_url: g.photo_url,
        member_count: members.filter((m) => !m.left_on && m.link_status === "accepted").length,
        upcoming_count: counts.get(g.id) ?? 0,
        on_tour: touring.has(g.id),
        created_at: g.created_at,
      };
    }),
  ];

  return items
    .sort((a, b) => b.upcoming_count - a.upcoming_count || Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, limit);
}
