import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { groupHits, isSearchable, orderProfiles, pickBestMatch, type Hit } from "@/lib/search";
import { LISTING_CACHE, SHOW_COLUMNS } from "./home";
import type { ShowRow, TourRow } from "./types";

export type SearchGroup = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  member_count: number;
  upcoming_count: number;
  tour_count: number;
};

export type SearchComedian = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  group_names: string[];
};

export type SearchVenue = { id: string; name: string; slug: string; city_name: string | null };

export type SearchResults = {
  best: { kind: "group"; item: SearchGroup } | { kind: "comedian"; item: SearchComedian } | null;
  groups: SearchGroup[];
  comedians: SearchComedian[];
  shows: ShowRow[];
  tours: TourRow[];
  venues: SearchVenue[];
};

export const EMPTY_RESULTS: SearchResults = { best: null, groups: [], comedians: [], shows: [], tours: [], venues: [] };

type Membership = { group_id: string; comedian_id: string; left_on: string | null; link_status: string };

const current = (m: Membership) => !m.left_on && m.link_status === "accepted";
const unique = (ids: Iterable<string>) => [...new Set(ids)];

/**
 * Search across groups, comedians, shows, tours and venues (spec section 8).
 * A group match also brings its members; a comedian match brings their groups;
 * shows and tours of every profile found are included.
 */
export async function searchRadar(q: string): Promise<SearchResults> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("profiles", "shows", "tours", "venues");
  const db = createPublicClient();
  if (!db || !isSearchable(q)) return EMPTY_RESULTS;

  const { data: hitRows, error } = await db.rpc("search_radar", { q });
  if (error) {
    console.error("search_radar", error.message);
    return EMPTY_RESULTS;
  }
  const hits = groupHits((hitRows ?? []) as Hit[]);
  const matchedComedians = [...hits.comedian.keys()];
  const matchedGroups = [...hits.group.keys()];

  // 1. Related profiles: members of matched groups, groups of matched comedians.
  let related: Membership[] = [];
  if (matchedComedians.length || matchedGroups.length) {
    const filters = [
      matchedComedians.length ? `comedian_id.in.(${matchedComedians.join(",")})` : null,
      matchedGroups.length ? `group_id.in.(${matchedGroups.join(",")})` : null,
    ].filter(Boolean);
    const { data } = await db
      .from("group_members")
      .select("group_id, comedian_id, left_on, link_status")
      .or(filters.join(","));
    related = ((data ?? []) as Membership[]).filter(current);
  }
  const groupIds = unique([...matchedGroups, ...related.map((m) => m.group_id)]);
  const comedianIds = unique([...matchedComedians, ...related.map((m) => m.comedian_id)]);
  const profileIds = [...groupIds, ...comedianIds];

  // 2. Details, memberships (for "Member of …" and member counts), shows, tours, venues.
  const showFilters = [
    hits.show.size ? `id.in.(${[...hits.show.keys()].join(",")})` : null,
    comedianIds.length ? `comedian_ids.ov.{${comedianIds.join(",")}}` : null,
    groupIds.length ? `group_ids.ov.{${groupIds.join(",")}}` : null,
  ].filter(Boolean);
  const tourFilters = [
    hits.tour.size ? `id.in.(${[...hits.tour.keys()].join(",")})` : null,
    profileIds.length ? `owner_id.in.(${profileIds.join(",")})` : null,
  ].filter(Boolean);
  const none = Promise.resolve({ data: [] as never[] });

  const [groupRows, comedianRows, memberRows, showRows, tourRows, venueRows] = await Promise.all([
    groupIds.length
      ? db.from("comedy_groups").select("id, name, slug, photo_url").eq("status", "published").in("id", groupIds)
      : none,
    comedianIds.length
      ? db.from("comedians").select("id, name, slug, photo_url").eq("status", "published").in("id", comedianIds)
      : none,
    profileIds.length
      ? db
          .from("group_members")
          .select("group_id, comedian_id, left_on, link_status")
          .or(
            [
              groupIds.length ? `group_id.in.(${groupIds.join(",")})` : null,
              comedianIds.length ? `comedian_id.in.(${comedianIds.join(",")})` : null,
            ]
              .filter(Boolean)
              .join(","),
          )
      : none,
    showFilters.length
      ? db.from("v_upcoming_shows").select(SHOW_COLUMNS).or(showFilters.join(",")).order("starts_at").limit(60)
      : none,
    tourFilters.length
      ? db
          .from("v_tours")
          .select(
            "id, slug, name, poster_url, owner_type, owner_id, owner_name, owner_slug, owner_photo_url, first_show_at, " +
              "last_show_at, next_show_at, next_city_name, show_count, country_count, cities",
          )
          .or(tourFilters.join(","))
          .order("next_show_at")
          .limit(20)
      : none,
    hits.venue.size
      ? db
          .from("venues")
          .select("id, name, slug, cities(name)")
          .eq("status", "published")
          .in("id", [...hits.venue.keys()])
      : none,
  ]);

  const memberships = ((memberRows.data ?? []) as Membership[]).filter(current);
  const groupList = (groupRows.data ?? []) as { id: string; name: string; slug: string; photo_url: string | null }[];
  const groupName = new Map(groupList.map((g) => [g.id, g.name]));
  const shows = (showRows.data ?? []) as unknown as ShowRow[];
  const tours = (tourRows.data ?? []) as unknown as (TourRow & { owner_id: string })[];

  const groups: SearchGroup[] = groupList.map((g) => ({
    ...g,
    member_count: memberships.filter((m) => m.group_id === g.id).length,
    upcoming_count: shows.filter((s) => (s.group_ids ?? []).includes(g.id)).length,
    tour_count: tours.filter((t) => t.owner_id === g.id).length,
  }));
  const comedians: SearchComedian[] = (
    (comedianRows.data ?? []) as { id: string; name: string; slug: string; photo_url: string | null }[]
  ).map((c) => ({
    ...c,
    group_names: memberships
      .filter((m) => m.comedian_id === c.id && groupName.has(m.group_id))
      .map((m) => groupName.get(m.group_id)!),
  }));

  const orderedGroups = orderProfiles(groups, hits.group);
  const orderedComedians = orderProfiles(comedians, hits.comedian);

  // Shows and tours that matched by name come first, the rest by date.
  const byMatch = <T extends { id: string }>(items: T[], scores: Map<string, number>) =>
    [...items].sort((a, b) => Number(scores.has(b.id)) - Number(scores.has(a.id)));

  const venues: SearchVenue[] = (
    (venueRows.data ?? []) as unknown as { id: string; name: string; slug: string; cities: { name: string } | null }[]
  )
    .map((v) => ({ id: v.id, name: v.name, slug: v.slug, city_name: v.cities?.name ?? null }))
    .sort((a, b) => (hits.venue.get(b.id) ?? 0) - (hits.venue.get(a.id) ?? 0));

  // Only profiles that are actually shown can be the best match.
  const pick = pickBestMatch(
    new Map([...hits.group].filter(([id]) => groupName.has(id))),
    new Map([...hits.comedian].filter(([id]) => comedians.some((c) => c.id === id))),
  );
  const best =
    pick?.kind === "group"
      ? { kind: "group" as const, item: orderedGroups.find((g) => g.id === pick.id)! }
      : pick?.kind === "comedian"
        ? { kind: "comedian" as const, item: orderedComedians.find((c) => c.id === pick.id)! }
        : null;

  return {
    best,
    groups: orderedGroups,
    comedians: orderedComedians,
    shows: byMatch(shows, hits.show),
    tours: byMatch(tours, hits.tour),
    venues,
  };
}
