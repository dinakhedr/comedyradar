import "server-only";
import type { ManagedProfile } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { tourTabOf, type TourTab } from "@/lib/tour-forms";
import { getMyProfiles, requireAccount } from "./dashboard";
import { getShowFormOptions, type CityOption, type VenueOption } from "./my-shows";

/** Data for Add a tour and the dashboard Tours list (spec 11.4 items 8 and 10). Runs as the signed-in account. */

/** An upcoming show of a managed profile that is not on a tour yet ("Import my existing shows"). */
export type ImportableShow = { id: string; title: string; starts_at: string; city_name: string | null; performer: string };

export type TourFormOptions = { profiles: ManagedProfile[]; cities: CityOption[]; venues: VenueOption[]; importable: ImportableShow[] };

const key = (p: { comedian_id: string | null; group_id: string | null }) => (p.group_id ? `g:${p.group_id}` : `c:${p.comedian_id}`);

export async function getTourFormOptions(): Promise<TourFormOptions> {
  const [{ profiles, cities, venues }, supabase] = await Promise.all([getShowFormOptions(), createClient()]);
  const mine = new Set(profiles.map((p) => `${p.kind === "group" ? "g" : "c"}:${p.id}`));
  const { data, error } = await supabase
    .from("shows")
    .select("id, title, starts_at, cities(name), show_performers(billing_order, comedian_id, group_id)")
    .is("tour_id", null)
    .gte("starts_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("starts_at")
    .limit(500);
  if (error) console.error("importable shows", error.message);
  type Raw = { id: string; title: string; starts_at: string; cities: { name: string } | null; show_performers: { billing_order: number; comedian_id: string | null; group_id: string | null }[] };
  const importable = ((data ?? []) as unknown as Raw[]).flatMap((s) => {
    const main = [...(s.show_performers ?? [])].sort((a, b) => a.billing_order - b.billing_order)[0];
    const performer = main ? key(main) : "";
    return mine.has(performer) ? [{ id: s.id, title: s.title, starts_at: s.starts_at, city_name: s.cities?.name ?? null, performer }] : [];
  });
  return { profiles, cities, venues, importable };
}

export type TourDate = { id: string; title: string; starts_at: string; status: string; ticket_url: string | null; city_name: string | null; venue_name: string | null };

export type EditableTour = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  poster_url: string | null;
  status: "draft" | "pending" | "published" | "archived";
  performer: string;
  dates: TourDate[];
};

const DATE_FIELDS = "id, title, starts_at, status, ticket_url, cities(name), venues(name)";
type RawDate = Omit<TourDate, "city_name" | "venue_name"> & { cities: { name: string } | null; venues: { name: string } | null };
const toDate = (d: RawDate): TourDate => ({ id: d.id, title: d.title, starts_at: d.starts_at, status: d.status, ticket_url: d.ticket_url, city_name: d.cities?.name ?? null, venue_name: d.venues?.name ?? null });

/** A tour this account manages, with its dates, for the edit form. */
export async function getEditableTour(id: string, opts: { anyOwner?: boolean } = {}): Promise<EditableTour | null> {
  // anyOwner: the super admin (checked by the caller) edits any tour.
  const profiles = opts.anyOwner ? [] : await getMyProfiles();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select(`id, slug, name, description, poster_url, status, comedian_id, group_id, shows(${DATE_FIELDS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getEditableTour", error.message);
  if (!data) return null;
  const t = data as unknown as Omit<EditableTour, "performer" | "dates"> & { comedian_id: string | null; group_id: string | null; shows: RawDate[] };
  const performer = key(t);
  // Published tours of other people are readable too; only the ones this account manages are editable.
  if (!opts.anyOwner && !profiles.some((p) => `${p.kind === "group" ? "g" : "c"}:${p.id}` === performer)) return null;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    poster_url: t.poster_url,
    status: t.status,
    performer,
    dates: (t.shows ?? []).map(toDate).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  };
}

export type ListedTour = {
  id: string;
  slug: string;
  name: string;
  poster_url: string | null;
  status: EditableTour["status"];
  owner_kind: "comedian" | "group";
  owner_name: string;
  total: number;
  upcoming: number;
  done: number;
  countries: number;
  on_sale: number;
  sold_out: number;
  no_link: number;
  in_review: number;
  first_at: string | null;
  last_at: string | null;
  next: { starts_at: string; city_name: string | null } | null;
  cities: string[];
  views: number;
};

export type ToursList = {
  tours: ListedTour[];
  counts: Record<TourTab, number>;
  tiles: { active: number; upcomingDates: number; noLink: number; views: number };
};

const DAYS = 30;

export async function getMyTours(f: { tab: TourTab; q: string; kind: "comedian" | "group" | null; profile: ManagedProfile | null }): Promise<ToursList> {
  await requireAccount();
  const profiles = await getMyProfiles();
  const scope = f.profile ? [f.profile] : profiles;
  const c = scope.filter((p) => p.kind === "comedian").map((p) => p.id);
  const g = scope.filter((p) => p.kind === "group").map((p) => p.id);
  const empty = { tours: [], counts: { active: 0, drafts: 0, past: 0 }, tiles: { active: 0, upcomingDates: 0, noLink: 0, views: 0 } };
  const or = [c.length ? `comedian_id.in.(${c.join(",")})` : null, g.length ? `group_id.in.(${g.join(",")})` : null].filter(Boolean).join(",");
  if (!or) return empty;

  const supabase = await createClient();
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
  const [toursRes, statsRes] = await Promise.all([
    supabase
      .from("tours")
      .select("id, slug, name, poster_url, status, comedian_id, group_id, created_at, comedians(name), comedy_groups(name), shows(starts_at, status, ticket_url, cities(name, country_id))")
      .or(or)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.rpc("my_page_stats", { p_since: since }),
  ]);
  if (toursRes.error) console.error("getMyTours", toursRes.error.message);
  const views = new Map<string, number>();
  for (const r of (statsRes.data ?? []) as { kind: string; entity_id: string; total: number | string }[]) {
    if (r.kind === "tour_view") views.set(r.entity_id, (views.get(r.entity_id) ?? 0) + (Number(r.total) || 0));
  }

  type Raw = {
    id: string;
    slug: string;
    name: string;
    poster_url: string | null;
    status: ListedTour["status"];
    group_id: string | null;
    comedians: { name: string } | null;
    comedy_groups: { name: string } | null;
    shows: { starts_at: string; status: string; ticket_url: string | null; cities: { name: string; country_id: string } | null }[];
  };
  const now = Date.now();
  const all: ListedTour[] = ((toursRes.data ?? []) as unknown as Raw[]).map((t) => {
    const dates = (t.shows ?? []).filter((s) => s.status !== "cancelled").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const upcoming = dates.filter((s) => new Date(s.starts_at).getTime() >= now);
    const next = upcoming[0];
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      poster_url: t.poster_url,
      status: t.status,
      owner_kind: t.group_id ? "group" : "comedian",
      owner_name: t.comedy_groups?.name ?? t.comedians?.name ?? "",
      total: dates.length,
      upcoming: upcoming.length,
      done: dates.length - upcoming.length,
      countries: new Set(dates.map((s) => s.cities?.country_id).filter(Boolean)).size,
      on_sale: upcoming.filter((s) => s.status === "published" && s.ticket_url).length,
      sold_out: upcoming.filter((s) => s.status === "sold_out").length,
      no_link: upcoming.filter((s) => s.status !== "sold_out" && !s.ticket_url).length,
      in_review: upcoming.filter((s) => s.status === "pending" || s.status === "draft").length,
      first_at: dates[0]?.starts_at ?? null,
      last_at: dates.at(-1)?.starts_at ?? null,
      next: next ? { starts_at: next.starts_at, city_name: next.cities?.name ?? null } : null,
      cities: [...new Set(dates.map((s) => s.cities?.name).filter((n): n is string => !!n))],
      views: views.get(t.id) ?? 0,
    };
  });

  const tabOf = (t: ListedTour) => tourTabOf({ status: t.status, upcoming: t.upcoming, total: t.total });
  const counts = { active: 0, drafts: 0, past: 0 };
  for (const t of all) counts[tabOf(t)]++;
  const active = all.filter((t) => tabOf(t) === "active");

  const q = f.q.trim().toLowerCase();
  const tours = all
    .filter((t) => tabOf(t) === f.tab && (!f.kind || t.owner_kind === f.kind))
    .filter((t) => !q || [t.name, t.owner_name, ...t.cities].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => (a.next?.starts_at ?? a.last_at ?? "9").localeCompare(b.next?.starts_at ?? b.last_at ?? "9"));
  if (f.tab === "past") tours.reverse();

  return {
    tours,
    counts,
    tiles: {
      active: counts.active,
      upcomingDates: active.reduce((n, t) => n + t.upcoming, 0),
      noLink: active.reduce((n, t) => n + t.no_link, 0),
      views: all.reduce((n, t) => n + t.views, 0),
    },
  };
}

/** The tours of the profiles this account manages, for the Shows list filter and "Add to a tour". */
export async function getMyTourOptions(): Promise<{ id: string; name: string; owner: string }[]> {
  const profiles = await getMyProfiles();
  const c = profiles.filter((p) => p.kind === "comedian").map((p) => p.id);
  const g = profiles.filter((p) => p.kind === "group").map((p) => p.id);
  const or = [c.length ? `comedian_id.in.(${c.join(",")})` : null, g.length ? `group_id.in.(${g.join(",")})` : null].filter(Boolean).join(",");
  if (!or) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("tours").select("id, name, comedian_id, group_id").or(or).neq("status", "archived").order("created_at", { ascending: false }).limit(200);
  if (error) console.error("getMyTourOptions", error.message);
  return ((data ?? []) as { id: string; name: string; comedian_id: string | null; group_id: string | null }[]).map((t) => ({ id: t.id, name: t.name, owner: key(t) }));
}
