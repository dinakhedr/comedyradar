import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { ListedComedian } from "@/lib/comedians-filters";
import { whenRange } from "@/lib/dates";
import { LISTING_CACHE } from "./home";
import type { Person } from "./show";

export type ComedianListItem = ListedComedian & {
  id: string;
  slug: string;
  photo_url: string | null;
  country_name: string | null;
  /** Home country is not a Comedy Radar market (e.g. not Egypt): "Visiting from [Country]". */
  visiting: boolean;
  groups: Person[];
};
export type ComediansListing = {
  comedians: ComedianListItem[];
  countries: { code: string; name: string }[];
  groupCount: number;
};

const LIMIT = 2000;

/** Every published comedian with what the cards and filters need (spec 7.3). */
export async function getComediansListing(): Promise<ComediansListing> {
  "use cache";
  cacheLife(LISTING_CACHE);
  cacheTag("profiles", "shows", "tours", "podcasts");
  const db = createPublicClient();
  if (!db) return { comedians: [], countries: [], groupCount: 0 };

  const [comedians, groups, shows, tours, hosts] = await Promise.all([
    db
      .from("comedians")
      .select(
        "id, name, slug, photo_url, created_at, countries(code, name, is_market), " +
          "group_members(left_on, link_status, comedy_groups(id, name, slug, photo_url, status))",
      )
      .eq("status", "published")
      .limit(LIMIT),
    db.from("comedy_groups").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("v_upcoming_shows").select("starts_at, comedian_ids, group_ids").limit(LIMIT * 5),
    db.from("v_tours").select("owner_id").not("next_show_at", "is", null).limit(LIMIT),
    db.from("podcast_hosts").select("comedian_id, link_status, podcasts!inner(status)").limit(LIMIT * 2),
  ]);
  if (comedians.error) console.error("getComediansListing", comedians.error.message);

  const monthEnd = whenRange("month", new Date()).to.getTime();
  const showRows = (shows.data ?? []) as { starts_at: string; comedian_ids: string[] | null; group_ids: string[] | null }[];
  const touring = new Set(((tours.data ?? []) as { owner_id: string }[]).map((t) => t.owner_id));
  const podcasters = new Set(
    ((hosts.data ?? []) as unknown as { comedian_id: string; link_status: string; podcasts: { status: string } }[])
      .filter((h) => h.link_status === "accepted" && h.podcasts?.status === "published")
      .map((h) => h.comedian_id),
  );

  type Raw = {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    created_at: string;
    countries: { code: string; name: string; is_market: boolean } | null;
    group_members: {
      left_on: string | null;
      link_status: string;
      comedy_groups: (Person & { status: string }) | null;
    }[];
  };

  const countryNames = new Map<string, string>();
  const items: ComedianListItem[] = ((comedians.data ?? []) as unknown as Raw[]).map((c) => {
    const groups = (c.group_members ?? [])
      .filter((m) => !m.left_on && m.link_status === "accepted" && m.comedy_groups?.status === "published")
      .map(({ comedy_groups: g }) => ({ id: g!.id, name: g!.name, slug: g!.slug, photo_url: g!.photo_url }));
    const ids = new Set([c.id, ...groups.map((g) => g.id)]);
    // A comedian's shows: their own plus the shows of their current groups (like the comedian page).
    const mine = showRows.filter((s) => [...(s.comedian_ids ?? []), ...(s.group_ids ?? [])].some((id) => ids.has(id)));
    if (c.countries) countryNames.set(c.countries.code, c.countries.name);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      photo_url: c.photo_url,
      created_at: c.created_at,
      country_code: c.countries?.code ?? null,
      country_name: c.countries?.name ?? null,
      visiting: !!c.countries && !c.countries.is_market,
      groups,
      upcoming_count: mine.length,
      this_month: mine.some((s) => Date.parse(s.starts_at) < monthEnd),
      on_tour: [...ids].some((id) => touring.has(id)),
      has_podcast: podcasters.has(c.id),
    };
  });

  return {
    comedians: items,
    countries: [...countryNames].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
    groupCount: groups.count ?? 0,
  };
}
