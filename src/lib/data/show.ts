import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { LISTING_CACHE, SHOW_COLUMNS } from "./home";
import type { ShowRow } from "./types";

export type Person = { id: string; name: string; slug: string; photo_url: string | null };

export type ShowDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  doors_at: string | null;
  good_to_know: string[];
  status: "published" | "sold_out" | "cancelled";
  zone: "local" | "outbound" | "inbound";
  signal: "none" | "new" | "strong" | "fading";
  created_at: string;
  updated_at: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  ticket_url: string | null;
  poster_url: string | null;
  language: string | null;
  age_rating: string | null;
  city: { name: string; slug: string; country_name: string; country_code: string };
  venue: { name: string; slug: string; address: string | null; map_url: string | null; capacity: number | null } | null;
  tour: { name: string; slug: string } | null;
  /** Accepted, published performers in billing order. */
  performers: Performer[];
};

export type Performer = (Person & { kind: "group"; members: Person[] }) | (Person & { kind: "comedian" });

type Raw = Omit<ShowDetail, "city" | "venue" | "tour" | "performers"> & {
  cities: { name: string; slug: string; countries: { name: string; code: string } };
  venues: { name: string; slug: string; address: string | null; map_url: string | null; capacity: number | null; status: string } | null;
  tours: { name: string; slug: string; status: string } | null;
  show_performers: {
    billing_order: number;
    comedians: (Person & { status: string }) | null;
    comedy_groups:
      | (Person & {
          status: string;
          group_members: {
            display_order: number;
            left_on: string | null;
            comedians: (Person & { status: string }) | null;
          }[];
        })
      | null;
  }[];
};

const PERSON = "id, name, slug, photo_url, status";

/** One public show (published, sold out or cancelled) with venue, tour and performers. */
export async function getShow(slug: string): Promise<ShowDetail | null> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows", `show:${slug}`);
  const db = createPublicClient();
  if (!db) return null;

  const { data, error } = await db
    .from("shows")
    .select(
      "id, slug, title, description, starts_at, ends_at, doors_at, good_to_know, status, zone, signal, created_at, updated_at, price_min, " +
        "price_max, currency, ticket_url, poster_url, language, age_rating, " +
        "cities!inner(name, slug, countries!inner(name, code)), " +
        "venues(name, slug, address, map_url, capacity, status), tours(name, slug, status), " +
        `show_performers(billing_order, comedians(${PERSON}), ` +
        `comedy_groups(${PERSON}, group_members(display_order, left_on, comedians(${PERSON}))))`,
    )
    .eq("slug", slug)
    .in("status", ["published", "sold_out", "cancelled"])
    .maybeSingle();
  if (error) console.error("getShow", error.message);
  if (!data) return null;
  const raw = data as unknown as Raw;

  const pub = <T extends { status: string }>(x: T | null): x is T => !!x && x.status === "published";
  const person = ({ id, name, slug, photo_url }: Person): Person => ({ id, name, slug, photo_url });

  const performers: ShowDetail["performers"] = [...raw.show_performers]
    .sort((a, b) => a.billing_order - b.billing_order)
    .flatMap((p): Performer[] => {
      if (pub(p.comedy_groups)) {
        const g = p.comedy_groups;
        const members = [...g.group_members]
          .filter((m) => !m.left_on && pub(m.comedians))
          .sort((a, b) => a.display_order - b.display_order)
          .map((m) => person(m.comedians!));
        return [{ kind: "group" as const, ...person(g), members }];
      }
      if (pub(p.comedians)) return [{ kind: "comedian" as const, ...person(p.comedians) }];
      return [];
    });

  const { cities, venues, tours, show_performers: _sp, ...rest } = raw;
  void _sp;
  return {
    ...rest,
    city: { name: cities.name, slug: cities.slug, country_name: cities.countries.name, country_code: cities.countries.code },
    venue: pub(venues) ? { name: venues.name, slug: venues.slug, address: venues.address, map_url: venues.map_url, capacity: venues.capacity } : null,
    tour: pub(tours) ? { name: tours.name, slug: tours.slug } : null,
    performers,
  };
}

/** Upcoming shows by any of these profiles, and upcoming shows in the city (4 each). */
export async function getRelatedShows(
  showId: string,
  citySlug: string,
  comedianIds: string[],
  groupIds: string[],
): Promise<{ fromPerformers: ShowRow[]; inCity: ShowRow[] }> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows");
  const db = createPublicClient();
  if (!db) return { fromPerformers: [], inCity: [] };

  const filters = [
    comedianIds.length ? `comedian_ids.ov.{${comedianIds.join(",")}}` : null,
    groupIds.length ? `group_ids.ov.{${groupIds.join(",")}}` : null,
  ].filter(Boolean);

  const [mine, city] = await Promise.all([
    filters.length
      ? db.from("v_upcoming_shows").select(SHOW_COLUMNS).neq("id", showId).or(filters.join(",")).order("starts_at").limit(4)
      : Promise.resolve({ data: [] }),
    db.from("v_upcoming_shows").select(SHOW_COLUMNS).neq("id", showId).eq("city_slug", citySlug).order("starts_at").limit(8),
  ]);
  const fromPerformers = (mine.data ?? []) as unknown as ShowRow[];
  const taken = new Set(fromPerformers.map((s) => s.id));
  const inCity = ((city.data ?? []) as unknown as ShowRow[]).filter((s) => !taken.has(s.id)).slice(0, 4);
  return { fromPerformers, inCity };
}
