import "server-only";
import type { RefCity, RefCountry, RefPerformer, RefShow, RefTour, RefVenue, ShowRef } from "@/lib/bulk-import";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "./admin";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Every row of a select, 1,000 at a time (the Data API's page size). */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function performers(db: Db): Promise<RefPerformer[]> {
  const [comedians, groups] = await Promise.all([
    all<Omit<RefPerformer, "kind">>((a, b) => db.from("comedians").select("id, name, name_ar, home_country_id").neq("status", "archived").order("id").range(a, b)),
    all<Omit<RefPerformer, "kind">>((a, b) => db.from("comedy_groups").select("id, name, name_ar, home_country_id").neq("status", "archived").order("id").range(a, b)),
  ]);
  return [...comedians.map((c) => ({ ...c, kind: "comedian" as const })), ...groups.map((g) => ({ ...g, kind: "group" as const }))];
}

async function countries(db: Db): Promise<RefCountry[]> {
  return all<RefCountry>((a, b) => db.from("countries").select("id, code, name, is_market").order("code").range(a, b));
}

/** What a comedians file is checked against. Super admin only (RLS lets the super admin read every profile). */
export async function getComedianImportRef(): Promise<{ countries: RefCountry[]; performers: RefPerformer[] }> {
  await requireSuperAdmin();
  const db = await createClient();
  const [c, p] = await Promise.all([countries(db), performers(db)]);
  return { countries: c, performers: p };
}

/** What a shows file is checked against: places, venues, profiles, tours and the shows already coming up. */
export async function getShowImportRef(): Promise<ShowRef> {
  await requireSuperAdmin();
  const db = await createClient();
  const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const [c, cities, venues, p, tours, shows] = await Promise.all([
    countries(db),
    all<RefCity>((a, b) => db.from("cities").select("id, name, country_id").order("id").range(a, b)),
    all<RefVenue>((a, b) => db.from("venues").select("id, name, city_id, status").order("id").range(a, b)),
    performers(db),
    all<RefTour>((a, b) => db.from("tours").select("id, name").neq("status", "archived").order("id").range(a, b)),
    all<{ starts_at: string; city_id: string; status: string; show_performers: { comedian_id: string | null; group_id: string | null }[] }>((a, b) =>
      db.from("shows").select("starts_at, city_id, status, show_performers(comedian_id, group_id)").gte("starts_at", since).order("id").range(a, b),
    ),
  ]);
  return {
    countries: c,
    cities,
    venues,
    performers: p,
    tours,
    shows: shows.map(
      (s): RefShow => ({
        starts_at: s.starts_at,
        city_id: s.city_id,
        status: s.status,
        performer_ids: (s.show_performers ?? []).map((x) => x.comedian_id ?? x.group_id ?? "").filter(Boolean),
      }),
    ),
  };
}
