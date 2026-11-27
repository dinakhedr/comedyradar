import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { TOUR_COLUMNS, type Socials } from "./group";
import { LISTING_CACHE, SHOW_COLUMNS } from "./home";
import type { Person } from "./show";
import type { ShowRow, TourRow } from "./types";
import { podcastLinks } from "./comedian-links";

export type Podcast = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  is_active: boolean;
  coHosts: Person[];
  links: { label: string; url: string }[];
};

export type ComedianGroup = Person & { otherMembers: Person[]; member_count: number; upcoming_count: number };

export type ComedianDetail = Socials & {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  country_name: string | null;
  groups: ComedianGroup[];
  shows: ShowRow[];
  tours: TourRow[];
  podcasts: Podcast[];
};

type RawPerson = Person & { status: string };
type RawGroup = RawPerson & { group_members: { display_order: number; left_on: string | null; comedians: RawPerson | null }[] };
type RawPodcast = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  apple_podcasts_url: string | null;
  spotify_url: string | null;
  anghami_url: string | null;
  podu_url: string | null;
  youtube_url: string | null;
  is_active: boolean;
  status: string;
  podcast_hosts: { display_order: number; comedians: RawPerson | null }[];
};

const PERSON = "id, name, slug, photo_url, status";
const person = ({ id, name, slug, photo_url }: Person): Person => ({ id, name, slug, photo_url });

/** One published comedian with groups, upcoming shows, tours and podcasts. */
export async function getComedian(slug: string): Promise<ComedianDetail | null> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("profiles", "shows", "tours", "podcasts", `comedian:${slug}`);
  const db = createPublicClient();
  if (!db) return null;

  const { data, error } = await db
    .from("comedians")
    .select(
      "id, name, slug, bio, photo_url, website_url, instagram_url, tiktok_url, youtube_url, facebook_url, countries(name), " +
        `group_members(left_on, comedy_groups(${PERSON}, group_members(display_order, left_on, comedians(${PERSON})))), ` +
        "podcast_hosts(podcasts(id, name, slug, description, cover_url, apple_podcasts_url, spotify_url, anghami_url, " +
        `podu_url, youtube_url, is_active, status, podcast_hosts(display_order, comedians(${PERSON}))))`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) console.error("getComedian", error.message);
  if (!data) return null;
  const c = data as unknown as Socials & {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    photo_url: string | null;
    countries: { name: string } | null;
    group_members: { left_on: string | null; comedy_groups: RawGroup | null }[];
    podcast_hosts: { podcasts: RawPodcast | null }[];
  };

  const rawGroups = c.group_members
    .filter((m) => !m.left_on && m.comedy_groups?.status === "published")
    .map((m) => m.comedy_groups!);
  const groupIds = rawGroups.map((g) => g.id);

  const showFilters = [`comedian_ids.cs.{${c.id}}`, groupIds.length ? `group_ids.ov.{${groupIds.join(",")}}` : null].filter(Boolean);
  const [shows, tours] = await Promise.all([
    db.from("v_upcoming_shows").select(SHOW_COLUMNS).or(showFilters.join(",")).order("starts_at").limit(40),
    db.from("v_tours").select(TOUR_COLUMNS).in("owner_id", [c.id, ...groupIds]).order("next_show_at"),
  ]);
  const showRows = (shows.data ?? []) as unknown as ShowRow[];

  const groups: ComedianGroup[] = rawGroups.map((g) => {
    const members = [...g.group_members]
      .filter((m) => !m.left_on && m.comedians?.status === "published")
      .sort((a, b) => a.display_order - b.display_order)
      .map((m) => person(m.comedians!));
    return {
      ...person(g),
      otherMembers: members.filter((m) => m.id !== c.id),
      member_count: members.length,
      upcoming_count: showRows.filter((s) => (s.group_ids ?? []).includes(g.id)).length,
    };
  });

  const podcasts: Podcast[] = c.podcast_hosts
    .map((h) => h.podcasts)
    .filter((p): p is RawPodcast => !!p && p.status === "published")
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      cover_url: p.cover_url,
      is_active: p.is_active,
      coHosts: [...p.podcast_hosts]
        .filter((h) => h.comedians?.status === "published" && h.comedians.id !== c.id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((h) => person(h.comedians!)),
      links: podcastLinks(p),
    }));

  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    bio: c.bio,
    photo_url: c.photo_url,
    country_name: c.countries?.name ?? null,
    website_url: c.website_url ?? null,
    instagram_url: c.instagram_url,
    tiktok_url: c.tiktok_url,
    youtube_url: c.youtube_url,
    facebook_url: c.facebook_url,
    groups,
    shows: showRows,
    tours: (tours.data ?? []) as unknown as TourRow[],
    podcasts,
  };
}
