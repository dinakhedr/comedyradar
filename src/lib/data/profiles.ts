import "server-only";
import type { ProfileKind } from "@/lib/profile-forms";
import { createClient } from "@/lib/supabase/server";
import { byCountryName } from "@/lib/countries";
import { requireAccount } from "./dashboard";

/** Data for "Create or claim a profile" (spec 11.3). Runs as the signed-in account. */

export type Country = { id: string; name: string };

/** Countries for the "Home country" menu (empty until the super admin adds them). */
export async function getCountries(): Promise<Country[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("countries").select("id, code, name").limit(300);
  return ((data ?? []) as (Country & { code: string })[]).sort(byCountryName).map(({ id, name }) => ({ id, name }));
}

export type ClaimTarget = {
  kind: ProfileKind;
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  has_admin: boolean;
};

/** A published profile to claim, by its page address. */
export async function getClaimTarget(kind: ProfileKind, slug: string): Promise<ClaimTarget | null> {
  await requireAccount();
  const supabase = await createClient();
  const table = kind === "group" ? "comedy_groups" : "comedians";
  const { data } = await supabase.from(table).select("id, name, slug, photo_url").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const row = data as Omit<ClaimTarget, "kind" | "has_admin">;
  const { data: found } = await supabase.rpc("find_profiles", { q: row.name });
  const match = ((found ?? []) as { id: string; has_admin: boolean }[]).find((p) => p.id === row.id);
  return { ...row, kind, has_admin: match?.has_admin ?? false };
}

export type MyClaim = {
  id: string;
  kind: ProfileKind;
  profile_name: string;
  profile_slug: string | null;
  proof_method: string;
  proof_value: string | null;
  status: "pending" | "approved" | "rejected" | "expired";
  confirmed: boolean;
  confirm_token: string | null;
  decision_reason: string | null;
  created_at: string;
};

/** The account's own claims, newest first. */
export async function getMyClaims(): Promise<MyClaim[]> {
  const account = await requireAccount();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("access_requests")
    .select(
      "id, comedian_id, proof_method, proof_value, status, confirmed_at, confirm_token, decision_reason, created_at, " +
        "comedians(name, slug), comedy_groups(name, slug)",
    )
    .eq("account_id", account.id)
    .eq("type", "claim")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) console.error("getMyClaims", error.message);
  type Raw = Omit<MyClaim, "kind" | "profile_name" | "profile_slug" | "confirmed"> & {
    comedian_id: string | null;
    confirmed_at: string | null;
    comedians: { name: string; slug: string } | null;
    comedy_groups: { name: string; slug: string } | null;
  };
  return ((data ?? []) as unknown as Raw[]).map((r) => {
    const p = r.comedians ?? r.comedy_groups;
    return {
      id: r.id,
      kind: r.comedian_id ? "comedian" : "group",
      profile_name: p?.name ?? "A profile",
      profile_slug: p?.slug ?? null,
      proof_method: r.proof_method,
      proof_value: r.proof_value,
      status: r.status,
      confirmed: !!r.confirmed_at,
      confirm_token: r.confirm_token,
      decision_reason: r.decision_reason,
      created_at: r.created_at,
    };
  });
}
