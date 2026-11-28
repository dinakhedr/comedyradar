import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { byCountryName } from "@/lib/countries";
import { requireAccount } from "./dashboard";
import type { SiteError } from "@/lib/site-errors";

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

/** True when the signed-in account is the super admin with 2-step done. Never redirects (for server actions). */
export const isSuperAdminNow = cache(async (): Promise<boolean> => {
  const account = await requireAccount();
  if (!account.is_super_admin || account.is_suspended) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
});

/** For the 2-step page: a super admin, signed in, any level. */
export const requireSuperAdminAccount = cache(async () => {
  const account = await requireAccount();
  if (!account.is_super_admin || account.is_suspended) notFound();
  return account;
});

export type QueueItem = {
  type: "claims" | "profiles" | "shows" | "venues" | "names";
  count: number;
  oldest: string | null;
};

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
  spotlight_now: {
    title: string;
    slug: string;
    is_paid: boolean;
    ends_at: string;
  }[];
  recent_activity: {
    who: string;
    action: string;
    entity_type: string;
    at: string;
  }[];
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

export type TicketSiteClicks = { site: string; clicks: number; shows: number };

/** "Get tickets" clicks per ticket site in the last 30 days, most first. */
export async function getAdminTicketSites(): Promise<TicketSiteClicks[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ticket_sites");
  if (error) console.error("admin_ticket_sites", error.message);
  return (data ?? []) as TicketSiteClicks[];
}

/** The review queue, plus a short-lived link to a claim's document when one is open. */
export async function getReviewQueue(): Promise<
  import("@/lib/admin-review").ReviewQueue
> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_review_queue");
  if (error) console.error("admin_review_queue", error.message);
  return (data ?? {
    pending: [],
    done: [],
  }) as import("@/lib/admin-review").ReviewQueue;
}

export async function claimDocumentUrl(path: string): Promise<string | null> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("claim-documents")
    .createSignedUrl(path, 600);
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
  /** The square profile photo, added from the profile tables (not part of admin_profiles). */
  photo_url?: string | null;
};
export type AdminProfiles = {
  stats: {
    comedians: number;
    groups: number;
    no_admin: number;
    pending: number;
  };
  rows: AdminProfileRow[];
};
export type AdminAccess = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "moderator";
  status: string;
  via_team: boolean;
  since: string;
};

export async function getAdminProfiles(f: {
  kind: string;
  q: string;
  status: string;
  verified: string;
}): Promise<AdminProfiles> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_profiles", {
    p_kind: f.kind,
    p_q: f.q,
    p_status: f.status,
    p_verified: f.verified,
  });
  if (error) console.error("admin_profiles", error.message);
  const out = (data ?? {
    stats: { comedians: 0, groups: 0, no_admin: 0, pending: 0 },
    rows: [],
  }) as AdminProfiles;
  // Photos for the list: one small read per profile table that has rows (the super admin can read every profile).
  const photos = new Map<string, string>();
  const kinds = [...new Set(out.rows.map((r) => r.kind))];
  await Promise.all(
    kinds.map(async (k) => {
      const { data: rows, error: e } = await supabase
        .from(k === "group" ? "comedy_groups" : "comedians")
        .select("id, photo_url")
        .not("photo_url", "is", null);
      if (e) console.error("admin profile photos", e.message);
      for (const r of (rows ?? []) as { id: string; photo_url: string }[]) photos.set(`${k}:${r.id}`, r.photo_url);
    }),
  );
  for (const r of out.rows) r.photo_url = photos.get(`${r.kind}:${r.id}`) ?? null;
  return out;
}

export async function getAdminProfileAccess(
  kind: string,
  id: string,
): Promise<AdminAccess[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_profile_access", {
    p_kind: kind,
    p_id: id,
  });
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
  tour_id: string | null;
  /** Listed in the homepage "Coming up" section (on by default). */
  on_homepage: boolean;
  /** The show's own poster (null = it uses the tour poster). */
  poster_url: string | null;
  tour_poster_url: string | null;
  performers: string | null;
  added_by: string | null;
};
export type AdminShows = {
  stats: {
    upcoming: number;
    local: number;
    outbound: number;
    inbound: number;
    missing_ticket: number;
    cancelled: number;
    single?: number;
    on_tours?: number;
  };
  quality: {
    signal_requests: number;
    no_venue: number;
    tours_no_tickets: number;
    new_signal_days: number;
  };
  cities: { id: string; name: string; country_code: string; country?: string }[];
  comedians?: AdminShowComedian[];
  rows: AdminShowRow[];
};
export type AdminShowComedian = {
  id: string;
  name: string;
  photo_url: string | null;
  upcoming: number;
};
export type AdminTourRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  poster_url: string | null;
  owner: string | null;
  owner_kind: "comedian" | "group";
  shows: number;
  upcoming: number;
  missing_ticket: number;
  countries: number;
  first_at: string | null;
  last_at: string | null;
};
export type AdminPodcastRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  is_active: boolean;
  hosts: string | null;
  links: number;
};
export type AdminVenueRow = {
  id: string;
  name: string;
  name_ar: string | null;
  status: string;
  city: string;
  city_id: string;
  country_code: string;
  country_name: string;
  address: string | null;
  map_url: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  area: string | null;
  logo_url: string | null;
  slug: string;
  upcoming: number;
  added_by: string | null;
};

const EMPTY_SHOWS: AdminShows = {
  stats: {
    upcoming: 0,
    local: 0,
    outbound: 0,
    inbound: 0,
    missing_ticket: 0,
    cancelled: 0,
  },
  quality: {
    signal_requests: 0,
    no_venue: 0,
    tours_no_tickets: 0,
    new_signal_days: 7,
  },
  cities: [],
  rows: [],
};

export async function getAdminShows(f: {
  q: string;
  status: string;
  /** City ids; empty = all cities. */
  cities: string[];
  /** Comedian id; "" = all comedians. */
  comedian: string;
  period: string;
  /** "single" = not on a tour, "tour" = tour dates only. */
  kind: "single" | "tour" | "";
}): Promise<AdminShows> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_shows", {
    p_q: f.q,
    p_zone: "",
    p_status: f.status,
    p_cities: f.cities,
    p_comedian: f.comedian || null,
    p_period: f.period,
    p_kind: f.kind,
  });
  if (error) console.error("admin_shows", error.message);
  return (data ?? EMPTY_SHOWS) as AdminShows;
}

async function adminList<T>(
  fn: "admin_tours" | "admin_podcasts" | "admin_venues",
  q: string,
  status: string,
): Promise<T[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, { p_q: q, p_status: status });
  if (error) console.error(fn, error.message);
  return (data ?? []) as T[];
}
export const getAdminTours = (q: string, status: string) =>
  adminList<AdminTourRow>("admin_tours", q, status);
export const getAdminPodcasts = (q: string, status: string) =>
  adminList<AdminPodcastRow>("admin_podcasts", q, status);
export const getAdminVenues = (q: string, status: string) =>
  adminList<AdminVenueRow>("admin_venues", q, status);

export type AdminAccountRow = {
  id: string;
  name: string | null;
  email: string | null;
  type: "comedian" | "manager";
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  provider: string;
  two_step: boolean;
  suspended: boolean;
  super_admin: boolean;
  team_member: boolean;
  status: "active" | "unconfirmed" | "suspended";
  profiles: {
    name: string;
    kind: "comedian" | "group";
    slug: string;
    role: "admin" | "moderator";
    via_team: boolean;
  }[];
};
export type AdminAccountDetail = AdminAccountRow & {
  team: { name: string | null; status: string }[];
  member_of: { name: string | null; scope: string }[];
};
export type AdminAccounts = {
  stats: {
    total: number;
    comedians: number;
    managers: number;
    unconfirmed: number;
    suspended: number;
    new_7: number;
  };
  rows: AdminAccountRow[];
};

export async function getAdminAccounts(f: {
  q: string;
  type: string;
  status: string;
}): Promise<AdminAccounts> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_accounts", {
    p_q: f.q,
    p_type: f.type,
    p_status: f.status,
  });
  if (error) console.error("admin_accounts", error.message);
  return (data ?? {
    stats: {
      total: 0,
      comedians: 0,
      managers: 0,
      unconfirmed: 0,
      suspended: 0,
      new_7: 0,
    },
    rows: [],
  }) as AdminAccounts;
}

export async function getAdminAccount(
  id: string,
): Promise<AdminAccountDetail | null> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_account", { p_id: id });
  if (error) console.error("admin_account", error.message);
  return (data ?? null) as AdminAccountDetail | null;
}

export type AdminPlacement = {
  id: string;
  show_id: string;
  title: string;
  slug: string;
  show_at: string;
  city: string;
  starts_at: string;
  ends_at: string;
  priority: number;
  preferred_slide: number | null;
  is_paid: boolean;
  amount: number | null;
  currency: string;
  client_name: string | null;
  notes: string | null;
  impressions: number;
  clicks: number;
  state: "live" | "scheduled" | "ended";
};
export type AdminSpotlight = {
  stats: {
    live: number;
    scheduled: number;
    views: number;
    clicks: number;
    revenue: number;
  };
  live: AdminPlacement[];
  placements: AdminPlacement[];
  settings: { slides: number; seconds: number };
};
export type SpotlightShowOption = {
  id: string;
  title: string;
  starts_at: string;
  city: string;
};

export async function getAdminSpotlight(): Promise<AdminSpotlight> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_spotlight");
  if (error) console.error("admin_spotlight", error.message);
  return (data ?? {
    stats: { live: 0, scheduled: 0, views: 0, clicks: 0, revenue: 0 },
    live: [],
    placements: [],
    settings: { slides: 5, seconds: 6 },
  }) as AdminSpotlight;
}

export async function getSpotlightShowOptions(
  q: string,
): Promise<SpotlightShowOption[]> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_spotlight_shows", {
    p_q: q,
  });
  if (error) console.error("admin_spotlight_shows", error.message);
  return (data ?? []) as SpotlightShowOption[];
}

export type AdminActivity = {
  rows: import("@/lib/admin-activity").ActivityEntry[];
  people: { id: string; name: string }[];
  more: boolean;
};
export type ActivityFilters = {
  q: string;
  who: string;
  type: string;
  action: string;
  period: string;
  limit: number;
};

/** One page of the activity log. Null when the database says this is not a super admin with 2-step. */
export async function fetchActivity(
  f: ActivityFilters,
): Promise<AdminActivity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_activity", {
    p_q: f.q,
    p_who: f.who || null,
    p_type: f.type,
    p_action: f.action,
    p_period: f.period,
    p_before: null,
    p_limit: f.limit,
  });
  if (error) console.error("admin_activity", error.message);
  return (data ?? null) as AdminActivity | null;
}

export async function getAdminActivity(
  f: ActivityFilters,
): Promise<AdminActivity> {
  await requireSuperAdmin();
  return (await fetchActivity(f)) ?? { rows: [], people: [], more: false };
}

export type SiteErrorFilters = {
  q: string;
  source: string;
  period: string;
  limit: number;
};
export type SiteErrorLog = { rows: SiteError[]; more: boolean; last24: number };

/** Error log rows (the database checks the super admin and 2-step; null for anyone else). */
export async function fetchSiteErrors(
  f: SiteErrorFilters,
): Promise<SiteErrorLog | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_site_errors", {
    p_q: f.q,
    p_source: f.source,
    p_period: f.period,
    p_limit: f.limit,
  });
  if (error) console.error("admin_site_errors", error.message);
  return (data ?? null) as SiteErrorLog | null;
}

export async function getSiteErrors(f: SiteErrorFilters): Promise<SiteErrorLog> {
  await requireSuperAdmin();
  return (await fetchSiteErrors(f)) ?? { rows: [], more: false, last24: 0 };
}

/** How many different errors happened in the last 24 hours (for the red number on the tab). */
export async function getSiteErrorCount(): Promise<number> {
  return (await fetchSiteErrors({ q: "", source: "", period: "today", limit: 1 }))?.last24 ?? 0;
}

export type AdminSettings = {
  settings: Record<string, unknown>;
  countries: {
    id: string;
    code: string;
    name: string;
    region: string | null;
    is_market: boolean;
    cities: { id: string; name: string; slug: string; venues: number }[];
  }[];
  venues: { published: number; pending: number };
  super_admins: {
    name: string | null;
    email: string | null;
    two_step: boolean;
  }[];
};

export async function getAdminSettings(): Promise<AdminSettings> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_settings");
  if (error) console.error("admin_settings", error.message);
  const result = (data ?? {
    settings: {},
    countries: [],
    venues: { published: 0, pending: 0 },
    super_admins: [],
  }) as AdminSettings;
  // Egypt first, then A to Z (the database groups them by region).
  return { ...result, countries: [...result.countries].sort(byCountryName) };
}

export type AdminMessage = {
  id: string;
  name: string;
  email: string;
  sender_type: string | null;
  topic: string | null;
  page_url: string | null;
  message: string;
  status: "new" | "replied" | "closed";
  created_at: string;
};

/** Contact form messages, newest first (super admin only, through RLS). */
export async function getAdminMessages(opts: {
  status: string;
  q: string;
  limit: number;
}): Promise<{
  rows: AdminMessage[];
  counts: Record<"new" | "replied" | "closed", number>;
  more: boolean;
}> {
  await requireSuperAdmin();
  const supabase = await createClient();
  let query = supabase
    .from("contact_messages")
    .select(
      "id, name, email, sender_type, topic, page_url, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit + 1);
  if (opts.status) query = query.eq("status", opts.status);
  const q = opts.q.replace(/[%_,()\\]/g, " ").trim();
  if (q)
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,message.ilike.%${q}%`,
    );
  const count = (s: string) =>
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", s);
  const [list, n, r, c] = await Promise.all([
    query,
    count("new"),
    count("replied"),
    count("closed"),
  ]);
  if (list.error) console.error("contact_messages", list.error.message);
  const rows = (list.data ?? []) as AdminMessage[];
  return {
    rows: rows.slice(0, opts.limit),
    counts: { new: n.count ?? 0, replied: r.count ?? 0, closed: c.count ?? 0 },
    more: rows.length > opts.limit,
  };
}

export type DeleteImpact = { name: string; solo_shows: number; shared_shows: number; tours: number; solo_podcasts: number };

/** What deleting a profile would remove, for the confirm step. */
export async function getDeleteImpact(kind: "comedian" | "group", id: string): Promise<DeleteImpact | null> {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_profile_delete_impact", { p_kind: kind, p_id: id });
  if (error) console.error("admin_profile_delete_impact", error.message);
  return (data ?? null) as DeleteImpact | null;
}
