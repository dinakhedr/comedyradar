import "server-only";
import type { ManagedProfile } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { accessChips, type Role, type Shareable } from "@/lib/team-forms";
import { getMyProfiles, requireAccount } from "./dashboard";

/** Data for Team and access (spec 11.4 item 6). Runs as the signed-in owner. */

export type TeamAccess = Shareable & { role: Role; name: string };

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  scope: "all" | "selected";
  all_role: Role | null;
  status: "invited" | "active" | "expired";
  token: string | null;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  access: TeamAccess[];
  chips: string[];
};

export type Team = {
  members: TeamMember[];
  invites: TeamMember[];
  /** Profiles the owner is admin of: the only ones that can be shared. */
  shareable: (ManagedProfile & { role: "admin" })[];
  profiles: ManagedProfile[];
};

type Raw = Omit<TeamMember, "email" | "name" | "access" | "chips"> & {
  invite_email: string | null;
  member_name: string | null;
  member_account_id: string | null;
  selected: { kind: string; id: string; role: string }[] | null;
};

export async function getTeam(): Promise<Team> {
  await requireAccount();
  const profiles = await getMyProfiles();
  const shareable = profiles.filter((p): p is ManagedProfile & { role: "admin" } => p.role === "admin");
  const nameOf = new Map(profiles.map((p) => [`${p.kind}:${p.id}`, p.name]));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_team");
  if (error) console.error("my_team", error.message);
  const rows = (data ?? []) as Raw[];

  // What active "selected" members can reach today (their profile_access rows from this dashboard).
  const activeIds = rows.filter((r) => r.status === "active" && r.scope === "selected").map((r) => r.id);
  const { data: pa } = activeIds.length
    ? await supabase.from("profile_access").select("via_dashboard_member_id, comedian_id, group_id, role").in("via_dashboard_member_id", activeIds)
    : { data: [] };
  const granted = new Map<string, TeamAccess[]>();
  for (const r of (pa ?? []) as { via_dashboard_member_id: string; comedian_id: string | null; group_id: string | null; role: Role }[]) {
    const kind: TeamAccess["kind"] = r.group_id ? "group" : "comedian";
    const id = (r.group_id ?? r.comedian_id)!;
    const list = granted.get(r.via_dashboard_member_id) ?? [];
    list.push({ kind, id, role: r.role, name: nameOf.get(`${kind}:${id}`) ?? "A profile" });
    granted.set(r.via_dashboard_member_id, list);
  }

  const all = rows.map((r): TeamMember => {
    const access =
      r.scope === "all"
        ? []
        : r.status === "active"
          ? (granted.get(r.id) ?? [])
          : (r.selected ?? []).flatMap((s) => {
              const kind: TeamAccess["kind"] = s.kind === "group" ? "group" : "comedian";
              const name = nameOf.get(`${kind}:${s.id}`);
              return name ? [{ kind, id: s.id, role: (s.role === "admin" ? "admin" : "moderator") as Role, name }] : [];
            });
    return {
      id: r.id,
      email: r.invite_email ?? "",
      name: r.member_name,
      scope: r.scope,
      all_role: r.all_role,
      status: r.status,
      token: r.token,
      invited_at: r.invited_at,
      expires_at: r.expires_at,
      accepted_at: r.accepted_at,
      access,
      chips: accessChips(r, access),
    };
  });
  return { members: all.filter((m) => m.status === "active"), invites: all.filter((m) => m.status !== "active"), shareable, profiles };
}

export type InviteView = {
  owner_name: string;
  invite_email: string;
  scope: "all" | "selected";
  all_role: Role | null;
  profiles: { name: string; kind: string; role?: Role }[];
  status: "invited" | "active" | "removed" | "expired";
  for_me: boolean;
};

/** The invitation behind a private link (signed in or not). */
export async function getInvite(token: string): Promise<{ invite: InviteView | null; signedIn: boolean }> {
  const supabase = await createClient();
  const [{ data }, { data: claims }] = await Promise.all([supabase.rpc("team_invite", { p_token: token }), supabase.auth.getClaims()]);
  return { invite: ((data ?? []) as InviteView[])[0] ?? null, signedIn: !!claims?.claims?.sub };
}

/** Invitations waiting for the signed-in account (Overview banner). */
export async function getMyInvites(): Promise<{ token: string; owner_name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_team_invites");
  if (error) console.error("my_team_invites", error.message);
  return (data ?? []) as { token: string; owner_name: string }[];
}
