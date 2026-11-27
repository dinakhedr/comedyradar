import "server-only";
import type { ManagedProfile } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "./admin";
import { getShowFormOptions, type ShowFormOptions } from "./my-shows";
import type { TourFormOptions } from "./my-tours";

/**
 * Data for Admin > Add new show / Add new tour: the super admin can pick any
 * comedian or group on the site (not archived), and every published or
 * pending venue.
 */

type RawProfile = { id: string; name: string; slug: string; photo_url: string | null; status: ManagedProfile["status"]; verified: boolean };

async function allProfiles(): Promise<ManagedProfile[]> {
  const supabase = await createClient();
  const cols = "id, name, slug, photo_url, status, verified";
  const [c, g] = await Promise.all([
    supabase.from("comedians").select(cols).neq("status", "archived").order("name").limit(3000),
    supabase.from("comedy_groups").select(cols).neq("status", "archived").order("name").limit(1000),
  ]);
  if (c.error) console.error("admin performers", c.error.message);
  if (g.error) console.error("admin performers", g.error.message);
  const as = (kind: "comedian" | "group") => (p: RawProfile): ManagedProfile => ({ ...p, kind, role: "admin" });
  return [...((c.data ?? []) as RawProfile[]).map(as("comedian")), ...((g.data ?? []) as RawProfile[]).map(as("group"))].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function getAdminShowFormOptions(): Promise<ShowFormOptions> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const [base, profiles, venues] = await Promise.all([
    getShowFormOptions(),
    allProfiles(),
    supabase.from("venues").select("id, name, city_id, status").in("status", ["published", "pending"]).order("name").limit(3000),
  ]);
  type RawVenue = { id: string; name: string; city_id: string; status: string };
  const venueList = ((venues.data ?? []) as RawVenue[]).map((v) => ({ id: v.id, name: v.name, city_id: v.city_id, pending: v.status !== "published" }));
  return { ...base, profiles, venues: venueList };
}

export async function getAdminTourFormOptions(): Promise<TourFormOptions> {
  const { profiles, cities, venues } = await getAdminShowFormOptions();
  return { profiles, cities, venues, importable: [] };
}

/** A comedian or group (not archived) by kind and id, for the admin save actions. */
export async function findAnyPerformer(kind: "comedian" | "group", id: string): Promise<ManagedProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(kind === "group" ? "comedy_groups" : "comedians")
    .select("id, name, slug, photo_url, status, verified")
    .eq("id", id)
    .neq("status", "archived")
    .maybeSingle();
  return data ? { ...(data as RawProfile), kind, role: "admin" } : null;
}
