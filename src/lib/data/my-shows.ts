import "server-only";
import type { ManagedProfile } from "@/lib/dashboard";
import { sumStats } from "@/lib/page-stats";
import type { ShowTab } from "@/lib/show-forms";
import { createClient } from "@/lib/supabase/server";
import { getMyProfiles, requireAccount } from "./dashboard";

/** Data for Add a show and the dashboard Shows list (spec 11.4 items 4 and 9). Runs as the signed-in account. */

export type CityOption = { id: string; name: string; country_id: string; country_name: string; is_market: boolean };
export type VenueOption = { id: string; name: string; city_id: string; pending: boolean };
export type TourOption = { id: string; name: string; comedian_id: string | null; group_id: string | null };

export type ShowFormOptions = { profiles: ManagedProfile[]; cities: CityOption[]; venues: VenueOption[]; tours: TourOption[] };

export async function getShowFormOptions(): Promise<ShowFormOptions> {
  const account = await requireAccount();
  const supabase = await createClient();
  const [profiles, cities, venues, tours] = await Promise.all([
    getMyProfiles(),
    supabase.from("cities").select("id, name, country_id, countries(name, is_market)").order("name").limit(500),
    supabase.from("venues").select("id, name, city_id, status, created_by").in("status", ["published", "pending"]).order("name").limit(2000),
    supabase.from("tours").select("id, name, comedian_id, group_id, status").neq("status", "archived").order("created_at", { ascending: false }).limit(200),
  ]);
  type RawCity = { id: string; name: string; country_id: string; countries: { name: string; is_market: boolean } | null };
  const cityList = ((cities.data ?? []) as unknown as RawCity[])
    .map((c) => ({ id: c.id, name: c.name, country_id: c.country_id, country_name: c.countries?.name ?? "", is_market: !!c.countries?.is_market }))
    // The launch market first, then the other countries in alphabetical order.
    .sort((a, b) => Number(b.is_market) - Number(a.is_market) || a.country_name.localeCompare(b.country_name) || a.name.localeCompare(b.name));
  type RawVenue = { id: string; name: string; city_id: string; status: string; created_by: string | null };
  const venueList = ((venues.data ?? []) as RawVenue[])
    .filter((v) => v.status === "published" || v.created_by === account.id)
    .map((v) => ({ id: v.id, name: v.name, city_id: v.city_id, pending: v.status !== "published" }));
  return { profiles, cities: cityList, venues: venueList, tours: (tours.data ?? []) as TourOption[] };
}

export type EditableShow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  doors_at: string | null;
  city_id: string;
  venue_id: string | null;
  ticket_url: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  language: string | null;
  age_rating: string | null;
  good_to_know: string[];
  poster_url: string | null;
  poster_tall_url: string | null;
  status: "draft" | "pending" | "published" | "sold_out" | "cancelled";
  signal: string;
  signal_request: string | null;
  tour_id: string | null;
  performer: string | null;
  lineup: { id: string; name: string; link_status: string }[];
};

/** A show this account manages, for the edit form (or to copy into a new one). */
export async function getEditableShow(id: string): Promise<EditableShow | null> {
  await requireAccount();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shows")
    .select(
      "id, slug, title, description, starts_at, doors_at, city_id, venue_id, ticket_url, price_min, price_max, currency, language, " +
        "age_rating, good_to_know, poster_url, poster_tall_url, status, signal, signal_request, tour_id, " +
        "show_performers(comedian_id, group_id, billing_order, link_status, comedians(name), comedy_groups(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getEditableShow", error.message);
  if (!data) return null;
  type Raw = Omit<EditableShow, "performer" | "lineup"> & {
    show_performers: { comedian_id: string | null; group_id: string | null; billing_order: number; link_status: string; comedians: { name: string } | null; comedy_groups: { name: string } | null }[];
  };
  const { show_performers, ...s } = data as unknown as Raw;
  const sorted = [...(show_performers ?? [])].sort((a, b) => a.billing_order - b.billing_order);
  const main = sorted[0];
  return {
    ...s,
    good_to_know: s.good_to_know ?? [],
    performer: main ? (main.group_id ? `g:${main.group_id}` : `c:${main.comedian_id}`) : null,
    lineup: sorted
      .slice(1)
      .filter((p) => p.comedian_id)
      .map((p) => ({ id: p.comedian_id!, name: p.comedians?.name ?? "A comedian", link_status: p.link_status })),
  };
}

export type ListedShow = {
  id: string;
  tour_id: string | null;
  slug: string;
  title: string;
  starts_at: string;
  status: EditableShow["status"];
  signal: string;
  signal_request: string | null;
  ticket_url: string | null;
  city_name: string | null;
  venue_name: string | null;
  tour_name: string | null;
  performers: string[];
  clicks: number;
};

export type ShowsListFilters = { tab: ShowTab; q: string; profile: ManagedProfile | null; city: string | null; tour?: string | null };

export type ShowsList = {
  shows: ListedShow[];
  counts: Record<ShowTab, number>;
  tiles: { upcoming: number; drafts: number; review: number; clicks: number };
  cities: { id: string; name: string }[];
};

/** Ids of every show of these profiles, plus the shows this account created. */
async function myShowIds(profiles: ManagedProfile[], withOwn: boolean): Promise<string[]> {
  const account = await requireAccount();
  const supabase = await createClient();
  const c = profiles.filter((p) => p.kind === "comedian").map((p) => p.id);
  const g = profiles.filter((p) => p.kind === "group").map((p) => p.id);
  const filters = [c.length ? `comedian_id.in.(${c.join(",")})` : null, g.length ? `group_id.in.(${g.join(",")})` : null].filter(Boolean);
  const [perf, own] = await Promise.all([
    filters.length ? supabase.from("show_performers").select("show_id").or(filters.join(",")).limit(5000) : Promise.resolve({ data: [] }),
    withOwn ? supabase.from("shows").select("id").eq("created_by", account.id).limit(5000) : Promise.resolve({ data: [] }),
  ]);
  return [
    ...new Set([
      ...((perf.data ?? []) as { show_id: string }[]).map((r) => r.show_id),
      ...((own.data ?? []) as { id: string }[]).map((r) => r.id),
    ]),
  ];
}

const DAYS = 30;

export async function getMyShows(f: ShowsListFilters): Promise<ShowsList> {
  const profiles = await getMyProfiles();
  const ids = await myShowIds(f.profile ? [f.profile] : profiles, !f.profile);
  const empty = { upcoming: 0, drafts: 0, review: 0, past: 0, cancelled: 0 };
  if (!ids.length) return { shows: [], counts: empty, tiles: { upcoming: 0, drafts: 0, review: 0, clicks: 0 }, cities: [] };

  const supabase = await createClient();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
  const [rowsRes, statsRes] = await Promise.all([
    supabase
      .from("shows")
      .select(
        "id, slug, title, starts_at, status, signal, signal_request, ticket_url, tour_id, city_id, cities(name), venues(name), tours(name), " +
          "show_performers(billing_order, comedians(name), comedy_groups(name))",
      )
      .in("id", ids.slice(0, 1000))
      .order("starts_at")
      .limit(1000),
    supabase.rpc("my_page_stats", { p_since: since }),
  ]);
  if (rowsRes.error) console.error("getMyShows", rowsRes.error.message);
  const stats = sumStats(((statsRes.data ?? []) as { kind: string; entity_id: string; total: number }[]).filter((r) => ids.includes(r.entity_id)));

  type Raw = Omit<ListedShow, "city_name" | "venue_name" | "tour_name" | "performers" | "clicks"> & {
    city_id: string;
    cities: { name: string } | null;
    venues: { name: string } | null;
    tours: { name: string } | null;
    show_performers: { billing_order: number; comedians: { name: string } | null; comedy_groups: { name: string } | null }[];
  };
  const now = Date.now();
  const all = ((rowsRes.data ?? []) as unknown as Raw[]).map((s) => ({
    city_id: s.city_id,
    row: {
      id: s.id,
      tour_id: s.tour_id,
      slug: s.slug,
      title: s.title,
      starts_at: s.starts_at,
      status: s.status,
      signal: s.signal,
      signal_request: s.signal_request,
      ticket_url: s.ticket_url,
      city_name: s.cities?.name ?? null,
      venue_name: s.venues?.name ?? null,
      tour_name: s.tours?.name ?? null,
      performers: [...(s.show_performers ?? [])]
        .sort((a, b) => a.billing_order - b.billing_order)
        .map((p) => p.comedy_groups?.name ?? p.comedians?.name)
        .filter((n): n is string => !!n),
      clicks: stats.clicksByShow.get(s.id) ?? 0,
    } satisfies ListedShow,
  }));

  const tabOf = (s: ListedShow): ShowTab => {
    if (s.status === "cancelled") return "cancelled";
    if (s.status === "draft") return "drafts";
    if (s.status === "pending") return "review";
    return new Date(s.starts_at).getTime() < now ? "past" : "upcoming";
  };
  const counts = { ...empty };
  for (const { row } of all) counts[tabOf(row)]++;

  const q = f.q.trim().toLowerCase();
  const shows = all
    .filter(({ row, city_id }) => tabOf(row) === f.tab && (!f.city || city_id === f.city) && (!f.tour || row.tour_id === f.tour))
    .map(({ row }) => row)
    .filter((s) => !q || [s.title, s.venue_name, s.city_name, s.tour_name, ...s.performers].some((v) => v?.toLowerCase().includes(q)));
  if (f.tab === "past" || f.tab === "cancelled") shows.reverse();

  const cities = [...new Map(all.filter((a) => a.row.city_name).map((a) => [a.city_id, { id: a.city_id, name: a.row.city_name! }])).values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return {
    shows,
    counts,
    tiles: { upcoming: counts.upcoming, drafts: counts.drafts, review: counts.review, clicks: stats.clicks },
    cities,
  };
}
