import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAccount } from "./dashboard";

/**
 * Super admin panel access (spec 11.5): accounts.is_super_admin and 2-step
 * verification. Anyone else gets "page not found", so the panel stays hidden.
 * The database checks the same thing (private.is_super_admin needs aal2).
 */
export const requireSuperAdmin = cache(async () => {
  const account = await requireAccount();
  if (!account.is_super_admin || account.is_suspended) notFound();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel !== "aal2") redirect("/admin/two-step");
  return account;
});

/** For the 2-step page: a super admin, signed in, any level. */
export const requireSuperAdminAccount = cache(async () => {
  const account = await requireAccount();
  if (!account.is_super_admin || account.is_suspended) notFound();
  return account;
});

export type QueueItem = { type: "claims" | "profiles" | "shows" | "venues" | "names"; count: number; oldest: string | null };

export type AdminOverview = {
  upcoming_shows: number;
  active_tours: number;
  profiles: number;
  profiles_verified: number;
  profiles_no_admin: number;
  creator_accounts: number;
  views_30: number;
  clicks_30: number;
  subscribers: number;
  spotlight_clicks_30: number;
  queue: QueueItem[];
  no_ticket_soon: { title: string; slug: string; starts_at: string }[];
  no_ticket_soon_count: number;
  seeded_no_admin: { name: string; slug: string }[];
  spotlight_now: { title: string; slug: string; is_paid: boolean; ends_at: string }[];
  recent_activity: { who: string; action: string; entity_type: string; at: string }[];
  new_accounts_7: number;
  claims_approved_7: number;
};

export async function getAdminOverview(): Promise<AdminOverview | null> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) console.error("admin_overview", error.message);
  return (data ?? null) as AdminOverview | null;
}

/** The review queue, plus a short-lived link to a claim's document when one is open. */
export async function getReviewQueue(): Promise<import("@/lib/admin-review").ReviewQueue> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_review_queue");
  if (error) console.error("admin_review_queue", error.message);
  return (data ?? { pending: [], done: [] }) as import("@/lib/admin-review").ReviewQueue;
}

export async function claimDocumentUrl(path: string): Promise<string | null> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("claim-documents").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export type AdminProfileRow = {
  kind: "comedian" | "group";
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  status: "draft" | "pending" | "published" | "archived";
  verified: boolean;
  seeded: boolean;
  admins: number;
  people: number;
  upcoming: number;
  created_at: string;
};
export type AdminProfiles = { stats: { comedians: number; groups: number; no_admin: number; pending: number }; rows: AdminProfileRow[] };
export type AdminAccess = { id: string; name: string | null; email: string; role: "admin" | "moderator"; status: string; via_team: boolean; since: string };

export async function getAdminProfiles(f: { kind: string; q: string; status: string; verified: string }): Promise<AdminProfiles> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_profiles", { p_kind: f.kind, p_q: f.q, p_status: f.status, p_verified: f.verified });
  if (error) console.error("admin_profiles", error.message);
  return (data ?? { stats: { comedians: 0, groups: 0, no_admin: 0, pending: 0 }, rows: [] }) as AdminProfiles;
}

export async function getAdminProfileAccess(kind: string, id: string): Promise<AdminAccess[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_profile_access", { p_kind: kind, p_id: id });
  if (error) console.error("admin_profile_access", error.message);
  return (data ?? []) as AdminAccess[];
}

export type AdminShowRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  status: "draft" | "pending" | "published" | "sold_out" | "cancelled";
  signal: "none" | "new" | "strong" | "fading";
  signal_request: "none" | "new" | "strong" | "fading" | null;
  zone: "local" | "outbound" | "inbound";
  ticket_url: string | null;
  source_type: string;
  city: string;
  country_code: string;
  venue: string | null;
  tour: string | null;
  performers: string | null;
  added_by: string | null;
};
export type AdminShows = {
  stats: { upcoming: number; local: number; outbound: number; inbound: number; missing_ticket: number; cancelled: number };
  quality: { signal_requests: number; no_venue: number; tours_no_tickets: number; new_signal_days: number };
  cities: { id: string; name: string; country_code: string }[];
  rows: AdminShowRow[];
};
export type AdminTourRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  owner: string | null;
  owner_kind: "comedian" | "group";
  shows: number;
  upcoming: number;
  missing_ticket: number;
  countries: number;
  first_at: string | null;
  last_at: string | null;
};
export type AdminPodcastRow = { id: string; slug: string; name: string; status: string; is_active: boolean; hosts: string | null; links: number };
export type AdminVenueRow = {
  id: string;
  name: string;
  name_ar: string | null;
  status: string;
  city: string;
  country_code: string;
  address: string | null;
  map_url: string | null;
  upcoming: number;
  added_by: string | null;
};

const EMPTY_SHOWS: AdminShows = {
  stats: { upcoming: 0, local: 0, outbound: 0, inbound: 0, missing_ticket: 0, cancelled: 0 },
  quality: { signal_requests: 0, no_venue: 0, tours_no_tickets: 0, new_signal_days: 7 },
  cities: [],
  rows: [],
};

export async function getAdminShows(f: { q: string; zone: string; status: string; city: string; period: string }): Promise<AdminShows> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_shows", { p_q: f.q, p_zone: f.zone, p_status: f.status, p_city: f.city || null, p_period: f.period });
  if (error) console.error("admin_shows", error.message);
  return (data ?? EMPTY_SHOWS) as AdminShows;
}

async function adminList<T>(fn: "admin_tours" | "admin_podcasts" | "admin_venues", q: string, status: string): Promise<T[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, { p_q: q, p_status: status });
  if (error) console.error(fn, error.message);
  return (data ?? []) as T[];
}
export const getAdminTours = (q: string, status: string) => adminList<AdminTourRow>("admin_tours", q, status);
export const getAdminPodcasts = (q: string, status: string) => adminList<AdminPodcastRow>("admin_podcasts", q, status);
export const getAdminVenues = (q: string, status: string) => adminList<AdminVenueRow>("admin_venues", q, status);
