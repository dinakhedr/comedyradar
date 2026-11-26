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
