import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { cleanStyles, isGroupLanguage, type GroupLanguage, type GroupStyle } from "@/lib/group-styles";
import { LISTING_CACHE, SHOW_COLUMNS } from "./home";
import type { Person } from "./show";
import type { ShowRow, TourRow } from "./types";

export type Socials = {
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
};

export type GroupMember = Person & { solo_count: number; hosts_podcast: boolean };

export type GroupDetail = Socials & {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  /** Wide header photo (falls back to the main photo). */
  cover_url: string | null;
  country_name: string | null;
  styles: GroupStyle[];
  performing_language: GroupLanguage | null;
  members: GroupMember[];
  shows: ShowRow[];
  tours: TourRow[];
  /** The next solo (non-group) show of each member, soonest first. */
  soloShows: { member: Person; show: ShowRow }[];
};

type RawPerson = Person & { status: string };

export const TOUR_COLUMNS =
  "id, slug, name, poster_url, owner_type, owner_id, owner_name, owner_slug, owner_photo_url, first_show_at, " +
  "last_show_at, next_show_at, next_city_name, show_count, country_count, cities";

/** One published comedy group with members, upcoming group shows, tours and members' solo shows. */
export async function getGroup(slug: string): Promise<GroupDetail | null> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("profiles", "shows", "tours", `group:${slug}`);
  const db = createPublicClient();
  if (!db) return null;

  const { data, error } = await db
    .from("comedy_groups")
    .select(
      "id, name, slug, bio, photo_url, cover_url, styles, performing_language, instagram_url, tiktok_url, youtube_url, facebook_url, countries(name), " +
        "group_members(display_order, left_on, comedians(id, name, slug, photo_url, status))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) console.error("getGroup", error.message);
  if (!data) return null;
  const g = data as unknown as Socials & {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    photo_url: string | null;
    cover_url: string | null;
    countries: { name: string } | null;
    styles: string[] | null;
    performing_language: string | null;
    group_members: { display_order: number; left_on: string | null; comedians: RawPerson | null }[];
  };

  const members: Person[] = [...g.group_members]
    .filter((m) => !m.left_on && m.comedians?.status === "published")
    .sort((a, b) => a.display_order - b.display_order)
    .map(({ comedians: c }) => ({ id: c!.id, name: c!.name, slug: c!.slug, photo_url: c!.photo_url }));
  const memberIds = members.map((m) => m.id);

  const [groupShows, memberShows, tours, hosts] = await Promise.all([
    db.from("v_upcoming_shows").select(SHOW_COLUMNS).contains("group_ids", [g.id]).order("starts_at").limit(24),
    memberIds.length
      ? db.from("v_upcoming_shows").select(SHOW_COLUMNS).overlaps("comedian_ids", memberIds).order("starts_at").limit(200)
      : Promise.resolve({ data: [] }),
    db.from("v_tours").select(TOUR_COLUMNS).eq("owner_id", g.id).order("next_show_at"),
    memberIds.length
      ? db.from("podcast_hosts").select("comedian_id, podcasts!inner(status)").in("comedian_id", memberIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Solo shows: shows a member performs in that are not this group's shows.
  const solo = ((memberShows.data ?? []) as unknown as ShowRow[]).filter((s) => !(s.group_ids ?? []).includes(g.id));
  const hostIds = new Set(
    ((hosts.data ?? []) as unknown as { comedian_id: string; podcasts: { status: string } }[])
      .filter((h) => h.podcasts?.status === "published")
      .map((h) => h.comedian_id),
  );

  const soloShows = members
    .map((member) => ({ member, show: solo.find((s) => (s.comedian_ids ?? []).includes(member.id)) }))
    .filter((x): x is { member: Person; show: ShowRow } => !!x.show)
    .sort((a, b) => Date.parse(a.show.starts_at) - Date.parse(b.show.starts_at));

  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    bio: g.bio,
    photo_url: g.photo_url,
    cover_url: g.cover_url ?? null,
    country_name: g.countries?.name ?? null,
    styles: cleanStyles(g.styles),
    performing_language: isGroupLanguage(g.performing_language) ? g.performing_language : null,
    instagram_url: g.instagram_url,
    tiktok_url: g.tiktok_url,
    youtube_url: g.youtube_url,
    facebook_url: g.facebook_url,
    members: members.map((m) => ({
      ...m,
      solo_count: solo.filter((s) => (s.comedian_ids ?? []).includes(m.id)).length,
      hosts_podcast: hostIds.has(m.id),
    })),
    shows: (groupShows.data ?? []) as unknown as ShowRow[],
    tours: (tours.data ?? []) as unknown as TourRow[],
    soloShows,
  };
}
