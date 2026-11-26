import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  ilikeTerm,
  LANGUAGE_OPTIONS,
  SHOWS_PER_PAGE,
  showsWindow,
  trendingSort,
  type ShowsFilters,
} from "@/lib/shows-filters";
import { LISTING_CACHE, SHOW_COLUMNS } from "./home";
import type { ShowRow } from "./types";

export type ShowsPage = { shows: ShowRow[]; total: number };
export type PerformerOption = { kind: "comedian" | "group"; name: string; slug: string };

/** Trending is sorted here, not in the database, so it reads at most this many shows. */
const TRENDING_LIMIT = 500;

/** One page of the All shows list for the given filters (spec 7.1). */
export async function getShowsPage(f: ShowsFilters): Promise<ShowsPage> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows", "profiles");
  const db = createPublicClient();
  if (!db) return { shows: [], total: 0 };

  // Performer filter: a comedian's own shows plus the shows of their current groups.
  let performer: string | null = null;
  if (f.comedian) {
    const { data } = await db
      .from("comedians")
      .select("id, group_members(group_id, left_on)")
      .eq("slug", f.comedian)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return { shows: [], total: 0 };
    const groups = ((data.group_members ?? []) as { group_id: string; left_on: string | null }[])
      .filter((m) => !m.left_on)
      .map((m) => m.group_id);
    performer = [`comedian_ids.cs.{${data.id}}`, groups.length ? `group_ids.ov.{${groups.join(",")}}` : null]
      .filter(Boolean)
      .join(",");
  } else if (f.group) {
    const { data } = await db.from("comedy_groups").select("id").eq("slug", f.group).eq("status", "published").maybeSingle();
    if (!data) return { shows: [], total: 0 };
    performer = `group_ids.cs.{${data.id}}`;
  }

  const { from, to } = showsWindow(f, new Date());
  let q = db.from("v_upcoming_shows").select(SHOW_COLUMNS, { count: "exact" }).gte("starts_at", from.toISOString());
  if (to) q = q.lt("starts_at", to.toISOString());
  if (f.zone !== "all") q = q.eq("zone", f.zone);
  if (f.city) q = q.eq("city_slug", f.city);
  if (f.type !== "all") q = q.eq("headliner_type", f.type);
  if (f.lang) q = q.ilike("language", LANGUAGE_OPTIONS.find((o) => o.value === f.lang)!.label);
  if (f.hideSoldOut) q = q.eq("status", "published");
  const term = ilikeTerm(f.q);
  const search = term
    ? ["title", "headliner_name", "venue_name", "city_name"].map((c) => `${c}.ilike.${term}`).join(",")
    : null;
  // Only one or() filter per request: when both are set, wrap them in one and().
  if (performer && search) q = q.or(`and(or(${performer}),or(${search}))`);
  else if (performer || search) q = q.or((performer ?? search)!);

  const offset = (f.page - 1) * SHOWS_PER_PAGE;
  if (f.sort === "trending") {
    const { data, error, count } = await q.order("starts_at").limit(TRENDING_LIMIT);
    if (error) console.error("getShowsPage", error.message);
    const all = trendingSort((data ?? []) as unknown as ShowRow[]);
    return { shows: all.slice(offset, offset + SHOWS_PER_PAGE), total: Math.min(count ?? all.length, all.length) };
  }

  q = f.sort === "new" ? q.order("created_at", { ascending: false }).order("starts_at") : q.order("starts_at");
  const { data, error, count } = await q.range(offset, offset + SHOWS_PER_PAGE - 1);
  if (error) console.error("getShowsPage", error.message);
  return { shows: (data ?? []) as unknown as ShowRow[], total: count ?? 0 };
}

/** All upcoming shows in every zone (the title line "[N] upcoming shows"). */
export async function countUpcomingShows(): Promise<number> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows");
  const db = createPublicClient();
  if (!db) return 0;
  const { count } = await db.from("v_upcoming_shows").select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Comedians and groups with upcoming shows, A–Z, for the Performer dropdown. */
export async function getPerformerOptions(): Promise<PerformerOption[]> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("shows", "profiles");
  const db = createPublicClient();
  if (!db) return [];
  const { data } = await db.from("v_upcoming_shows").select("comedian_ids, group_ids").limit(1000);
  const rows = (data ?? []) as { comedian_ids: string[] | null; group_ids: string[] | null }[];
  const comedianIds = [...new Set(rows.flatMap((r) => r.comedian_ids ?? []))];
  const groupIds = [...new Set(rows.flatMap((r) => r.group_ids ?? []))];
  const [comedians, groups] = await Promise.all([
    comedianIds.length
      ? db.from("comedians").select("name, slug").in("id", comedianIds).eq("status", "published")
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? db.from("comedy_groups").select("name, slug").in("id", groupIds).eq("status", "published")
      : Promise.resolve({ data: [] }),
  ]);
  return [
    ...((comedians.data ?? []) as { name: string; slug: string }[]).map((c) => ({ kind: "comedian" as const, ...c })),
    ...((groups.data ?? []) as { name: string; slug: string }[]).map((g) => ({ kind: "group" as const, ...g })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}
