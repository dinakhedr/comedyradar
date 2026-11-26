import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { whenRange } from "@/lib/dates";
import type { ListedGroup } from "@/lib/groups-filters";
import { LISTING_CACHE } from "./home";
import type { Person } from "./show";

export type GroupListItem = ListedGroup & {
  id: string;
  slug: string;
  photo_url: string | null;
  members: Person[];
  next_city_name: string | null;
  /** The group's current tour, when it is on tour. */
  tour: { name: string; slug: string; show_count: number } | null;
};
export type GroupsListing = { groups: GroupListItem[]; comedianCount: number };

const LIMIT = 1000;

/** Every published comedy group with members, next show and tour (spec 7.4). */
export async function getGroupsListing(): Promise<GroupsListing> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("profiles", "shows", "tours");
  const db = createPublicClient();
  if (!db) return { groups: [], comedianCount: 0 };

  const [groups, comedians, shows, tours] = await Promise.all([
    db
      .from("comedy_groups")
      .select(
        "id, name, slug, photo_url, created_at, " +
          "group_members(display_order, left_on, link_status, comedians(id, name, slug, photo_url, status))",
      )
      .eq("status", "published")
      .limit(LIMIT),
    db.from("comedians").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("v_upcoming_shows").select("starts_at, city_name, group_ids").not("group_ids", "eq", "{}").order("starts_at").limit(LIMIT * 5),
    db.from("v_tours").select("owner_id, name, slug, show_count, next_show_at").eq("owner_type", "group").not("next_show_at", "is", null).order("next_show_at"),
  ]);
  if (groups.error) console.error("getGroupsListing", groups.error.message);

  const monthEnd = whenRange("month", new Date()).to.getTime();
  const showRows = (shows.data ?? []) as { starts_at: string; city_name: string; group_ids: string[] | null }[];
  const tourRows = (tours.data ?? []) as { owner_id: string; name: string; slug: string; show_count: number }[];

  type Raw = {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    created_at: string;
    group_members: {
      display_order: number;
      left_on: string | null;
      link_status: string;
      comedians: (Person & { status: string }) | null;
    }[];
  };

  const items: GroupListItem[] = ((groups.data ?? []) as unknown as Raw[]).map((g) => {
    const members = [...(g.group_members ?? [])]
      .filter((m) => !m.left_on && m.link_status === "accepted" && m.comedians?.status === "published")
      .sort((a, b) => a.display_order - b.display_order)
      .map(({ comedians: c }) => ({ id: c!.id, name: c!.name, slug: c!.slug, photo_url: c!.photo_url }));
    const next = showRows.find((s) => (s.group_ids ?? []).includes(g.id)) ?? null; // rows are soonest first
    const tour = tourRows.find((t) => t.owner_id === g.id) ?? null;
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      photo_url: g.photo_url,
      created_at: g.created_at,
      members,
      member_names: members.map((m) => m.name),
      next_show_at: next?.starts_at ?? null,
      next_city_name: next?.city_name ?? null,
      this_month: !!next && Date.parse(next.starts_at) < monthEnd,
      on_tour: !!tour,
      tour: tour ? { name: tour.name, slug: tour.slug, show_count: tour.show_count } : null,
    };
  });

  return { groups: items, comedianCount: comedians.count ?? 0 };
}
