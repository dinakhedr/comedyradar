import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { pickPosters } from "@/lib/posters";
import { createPublicClient } from "@/lib/supabase/public";
import { LISTING_CACHE } from "./home";
import type { Performer, Person } from "./show";
import type { TourRow } from "./types";

export type TourDate = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  status: "published" | "sold_out" | "cancelled";
  zone: "local" | "outbound" | "inbound";
  signal: "none" | "new" | "strong" | "fading";
  created_at: string;
  ticket_url: string | null;
  city_name: string;
  country_name: string;
  country_code: string;
  venue_name: string | null;
};

export type TourDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** The wide poster (banner, sharing). */
  poster_url: string | null;
  /** The tall poster, or null when the tour has only a wide one. */
  poster_tall_url: string | null;
  owner: Performer;
  dates: TourDate[];
};

type RawPerson = Person & { status: string };
type Raw = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  poster_url: string | null;
  poster_tall_url: string | null;
  comedians: RawPerson | null;
  comedy_groups:
    | (RawPerson & { group_members: { display_order: number; left_on: string | null; comedians: RawPerson | null }[] })
    | null;
  shows: {
    id: string;
    slug: string;
    title: string;
    starts_at: string;
    status: string;
    zone: TourDate["zone"];
    signal: TourDate["signal"];
    created_at: string;
    ticket_url: string | null;
    cities: { name: string; countries: { name: string; code: string } };
    venues: { name: string; status: string } | null;
  }[];
};

const PERSON = "id, name, slug, photo_url, status";
const pub = <T extends { status: string }>(x: T | null): x is T => !!x && x.status === "published";
const person = ({ id, name, slug, photo_url }: Person): Person => ({ id, name, slug, photo_url });

/** One published tour with its owner (and members) and every public date. */
export async function getTour(slug: string): Promise<TourDetail | null> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("tours", "shows", `tour:${slug}`);
  const db = createPublicClient();
  if (!db) return null;

  const { data, error } = await db
    .from("tours")
    .select(
      `id, slug, name, description, poster_url, poster_tall_url, comedians(${PERSON}), ` +
        `comedy_groups(${PERSON}, group_members(display_order, left_on, comedians(${PERSON}))), ` +
        "shows(id, slug, title, starts_at, status, zone, signal, created_at, ticket_url, " +
        "cities!inner(name, countries!inner(name, code)), venues(name, status))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) console.error("getTour", error.message);
  if (!data) return null;
  const raw = data as unknown as Raw;

  let owner: Performer | null = null;
  if (pub(raw.comedy_groups)) {
    const g = raw.comedy_groups;
    owner = {
      kind: "group",
      ...person(g),
      members: [...g.group_members]
        .filter((m) => !m.left_on && pub(m.comedians))
        .sort((a, b) => a.display_order - b.display_order)
        .map((m) => person(m.comedians!)),
    };
  } else if (pub(raw.comedians)) {
    owner = { kind: "comedian", ...person(raw.comedians) };
  }
  if (!owner) return null;

  const dates: TourDate[] = raw.shows
    .filter((s) => ["published", "sold_out", "cancelled"].includes(s.status))
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      starts_at: s.starts_at,
      status: s.status as TourDate["status"],
      zone: s.zone,
      signal: s.signal,
      created_at: s.created_at,
      ticket_url: s.ticket_url,
      city_name: s.cities.name,
      country_name: s.cities.countries.name,
      country_code: s.cities.countries.code,
      venue_name: s.venues && s.venues.status === "published" ? s.venues.name : null,
    }))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  const posters = pickPosters(raw);
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    poster_url: posters.wide,
    // Only a real tall poster changes the tour page layout; a wide-only tour keeps its banner.
    poster_tall_url: raw.poster_tall_url ? posters.tall : null,
    owner,
    dates,
  };
}

/** Other tours with upcoming dates, soonest first. */
export async function getMoreTours(excludeId: string, limit = 3): Promise<TourRow[]> {
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
    .neq("id", excludeId)
    .not("next_show_at", "is", null)
    .order("next_show_at")
    .limit(limit);
  if (error) console.error("getMoreTours", error.message);
  return (data ?? []) as unknown as TourRow[];
}
