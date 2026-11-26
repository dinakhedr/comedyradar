import "server-only";
import type { Role } from "@/lib/team-forms";
import type { LinkRequest } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";
import { requireAccount } from "./dashboard";

/** Data for the Requests page (spec 11.4 item 7). Runs as the signed-in account. */

export type IncomingInvite = { token: string; owner_name: string; scope: "all" | "selected"; all_role: Role | null; invited_at: string; expires_at: string };
export type SentInvite = { id: string; invite_email: string; status: "invited" | "expired"; invited_at: string; expires_at: string };

export type Requests = { links: LinkRequest[]; incomingInvites: IncomingInvite[]; sentInvites: SentInvite[] };

export async function getRequests(): Promise<Requests> {
  await requireAccount();
  const supabase = await createClient();
  const [links, incoming, team] = await Promise.all([supabase.rpc("my_link_requests"), supabase.rpc("my_team_invites"), supabase.rpc("my_team")]);
  if (links.error) console.error("my_link_requests", links.error.message);
  if (incoming.error) console.error("my_team_invites", incoming.error.message);
  if (team.error) console.error("my_team", team.error.message);
  return {
    links: (links.data ?? []) as LinkRequest[],
    incomingInvites: (incoming.data ?? []) as IncomingInvite[],
    sentInvites: ((team.data ?? []) as SentInvite[]).filter((m) => m.status === "invited" || m.status === "expired"),
  };
}
