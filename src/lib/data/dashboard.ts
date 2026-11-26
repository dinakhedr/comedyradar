import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ManagedProfile } from "@/lib/dashboard";
import { sumStats } from "@/lib/page-stats";
import { createClient } from "@/lib/supabase/server";

/**
 * Data for the creator dashboard. Everything here runs as the signed-in account,
 * so the database security rules (RLS) decide what it can read. Never cached on
 * the server: every request reads the session cookie.
 */

export type Account = {
  id: string;
  email: string;
  display_name: string | null;
  account_type: "comedian" | "manager";
  is_suspended: boolean;
  is_super_admin: boolean;
};

/** The signed-in account, or a redirect to Sign in. Read once per request. */
export const requireAccount = cache(async (): Promise<Account> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/signin?error=signin");
  const { data: row } = await supabase
    .from("accounts")
    .select("id, display_name, account_type, is_suspended, is_super_admin")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!row) redirect("/signin?error=signin");
  return { ...(row as Omit<Account, "email">), email: typeof claims.email === "string" ? claims.email : "" };
});

/** Profiles the account manages, with its role on each. */
export const getMyProfiles = cache(async (): Promise<ManagedProfile[]> => {
  await requireAccount();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_profiles");
  if (error) console.error("my_profiles", error.message);
  return (data ?? []) as ManagedProfile[];
});

/** Pending requests waiting for this account's answer (sidebar count). */
export const countIncomingRequests = cache(async (): Promise<number> => {
  const account = await requireAccount();
  const supabase = await createClient();
  const { count } = await supabase
    .from("link_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .neq("from_account_id", account.id);
  return count ?? 0;
});

type Performer = { comedian_id: string | null; group_id: string | null; comedians: { name: string } | null; comedy_groups: { name: string } | null };

export type DashboardShow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  status: "draft" | "pending" | "published" | "sold_out" | "cancelled";
  city_name: string | null;
  venue_name: string | null;
  performers: string[];
  clicks: number;
};

export type Overview = {
  upcoming: DashboardShow[];
  upcomingCount: number;
  pendingReview: number;
  views: number;
  clicks: number;
};

const DAYS = 30;

/** Overview numbers and upcoming shows, for all profiles or the one picked in the switcher. */
export async function getOverview(profiles: ManagedProfile[], picked: ManagedProfile | null): Promise<Overview> {
  const account = await requireAccount();
  const supabase = await createClient();
  const scope = picked ? [picked] : profiles;
  const comedianIds = scope.filter((p) => p.kind === "comedian").map((p) => p.id);
  const groupIds = scope.filter((p) => p.kind === "group").map((p) => p.id);

  // Every show of these profiles (any date), plus the shows this account created itself.
  const filters = [
    comedianIds.length ? `comedian_id.in.(${comedianIds.join(",")})` : null,
    groupIds.length ? `group_id.in.(${groupIds.join(",")})` : null,
  ].filter(Boolean);
  const [performerRows, ownRows, tourRows] = await Promise.all([
    filters.length
      ? supabase.from("show_performers").select("show_id").or(filters.join(",")).limit(2000)
      : Promise.resolve({ data: [] as { show_id: string }[] }),
    picked ? Promise.resolve({ data: [] as { id: string }[] }) : supabase.from("shows").select("id").eq("created_by", account.id).limit(1000),
    filters.length
      ? supabase.from("tours").select("id").or(filters.join(",")).limit(500)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const showIds = [
    ...new Set([
      ...((performerRows.data ?? []) as { show_id: string }[]).map((r) => r.show_id),
      ...((ownRows.data ?? []) as { id: string }[]).map((r) => r.id),
    ]),
  ];
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);

  const now = new Date().toISOString();
  const [upcomingRes, pendingShows, statsRes] = await Promise.all([
    showIds.length
      ? supabase
          .from("shows")
          .select(
            "id, slug, title, starts_at, status, cities(name), venues(name), " +
              "show_performers(comedian_id, group_id, comedians(name), comedy_groups(name))",
            { count: "exact" },
          )
          .in("id", showIds)
          .gte("starts_at", now)
          .neq("status", "cancelled")
          .order("starts_at")
          .limit(10)
      : Promise.resolve({ data: [], count: 0 }),
    showIds.length
      ? supabase.from("shows").select("id", { count: "exact", head: true }).in("id", showIds).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    supabase.rpc("my_page_stats", { p_since: since }),
  ]);
  if (statsRes.error) console.error("my_page_stats", statsRes.error.message);

  // Only count stats for the profiles in view, their shows and their tours.
  const inScope = new Set([...scope.map((p) => p.id), ...showIds, ...((tourRows.data ?? []) as { id: string }[]).map((t) => t.id)]);
  const stats = sumStats(
    ((statsRes.data ?? []) as { kind: string; entity_id: string; total: number }[]).filter((r) => inScope.has(r.entity_id)),
  );

  type RawShow = Omit<DashboardShow, "city_name" | "venue_name" | "performers" | "clicks"> & {
    cities: { name: string } | null;
    venues: { name: string } | null;
    show_performers: Performer[];
  };
  const upcoming = ((upcomingRes.data ?? []) as unknown as RawShow[])
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      starts_at: s.starts_at,
      status: s.status,
      city_name: s.cities?.name ?? null,
      venue_name: s.venues?.name ?? null,
      performers: (s.show_performers ?? []).map((p) => p.comedy_groups?.name ?? p.comedians?.name).filter((n): n is string => !!n),
      clicks: stats.clicksByShow.get(s.id) ?? 0,
    }));

  return {
    upcoming,
    upcomingCount: upcomingRes.count ?? upcoming.length,
    pendingReview: (pendingShows.count ?? 0) + scope.filter((p) => p.status === "pending").length,
    views: stats.views,
    clicks: stats.clicks,
  };
}
