"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/data/dashboard";
import { getTeam } from "@/lib/data/team";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";
import { checkAccess, checkInvite, type AccessChoice, type TeamErrors } from "@/lib/team-forms";

/** Team and access (spec 11.4 item 6): invite, change access, remove, send again, accept. */

export type TeamState = { ok?: boolean; message?: string; errors?: TeamErrors; attempt?: number; email?: string };

const readAccess = (form: FormData) => ({
  scope: text(form.get("scope")),
  all_role: text(form.get("all_role")),
  picked: form.getAll("profiles").map(String),
  roleOf: (key: string) => text(form.get(`role_${key}`)),
});

const selectedJson = (a: AccessChoice) => (a.scope === "selected" ? a.profiles.map((p) => ({ kind: p.kind, id: p.id, role: p.role })) : []);

export async function inviteMember(_prev: TeamState, form: FormData): Promise<TeamState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  const { shareable } = await getTeam();
  const r = checkInvite({ email: text(form.get("email")), ...readAccess(form) }, shareable, account.email);
  if (!r.access || !r.email) return { errors: r.errors, message: "Please check the highlighted fields.", attempt: Date.now(), email: text(form.get("email")) };

  const supabase = await createClient();
  const { error } = await supabase.from("dashboard_members").insert({
    owner_account_id: account.id,
    invite_email: r.email,
    scope: r.access.scope,
    all_role: r.access.scope === "all" ? r.access.role : null,
    selected: selectedJson(r.access),
  });
  if (error) {
    if (error.code === "23505") return { errors: { email: "This person is already in your team or invited." }, message: "Please check the highlighted fields.", attempt: Date.now(), email: r.email };
    console.error("invite", error.message);
    return { message: "We couldn't send the invitation. Please try again.", attempt: Date.now(), email: r.email };
  }
  refresh();
  return { ok: true, message: `Invitation ready for ${r.email}. Copy its link below and send it by WhatsApp or email.`, attempt: Date.now() };
}

/** Changes what a member (or an open invitation) can access. */
export async function updateAccess(_prev: TeamState, form: FormData): Promise<TeamState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  const id = text(form.get("member_id"));
  if (!UUID.test(id)) return { message: "We couldn't find this person." };
  const team = await getTeam();
  const member = [...team.members, ...team.invites].find((m) => m.id === id);
  if (!member) return { message: "We couldn't find this person." };
  const a = checkAccess(readAccess(form), team.shareable);
  if (!a.access) return { errors: { access: a.error }, message: a.error, attempt: Date.now() };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dashboard_members")
    .update({ scope: a.access.scope, all_role: a.access.scope === "all" ? a.access.role : null, selected: selectedJson(a.access) })
    .eq("id", id);
  if (error) {
    console.error("updateAccess", error.message);
    return { message: "We couldn't save the access. Please try again.", attempt: Date.now() };
  }

  // An active member's profile access follows the new choice at once.
  if (member.status === "active") {
    const { data: rows } = await supabase.from("profile_access").select("id, comedian_id, group_id, role").eq("via_dashboard_member_id", id);
    const current = (rows ?? []) as { id: string; comedian_id: string | null; group_id: string | null; role: string }[];
    const wanted = a.access.scope === "selected" ? a.access.profiles : [];
    const match = (r: (typeof current)[number], p: (typeof wanted)[number]) => (p.kind === "group" ? r.group_id === p.id : r.comedian_id === p.id);
    const drop = current.filter((r) => !wanted.some((p) => match(r, p))).map((r) => r.id);
    if (drop.length) await supabase.from("profile_access").delete().in("id", drop);
    const memberAccount = (await supabase.from("dashboard_members").select("member_account_id").eq("id", id).single()).data as { member_account_id: string } | null;
    for (const p of wanted) {
      const have = current.find((r) => match(r, p));
      if (have && have.role !== p.role) await supabase.from("profile_access").update({ role: p.role }).eq("id", have.id);
      else if (!have && memberAccount) {
        const { error: insErr } = await supabase.from("profile_access").insert({
          account_id: memberAccount.member_account_id,
          ...(p.kind === "group" ? { group_id: p.id } : { comedian_id: p.id }),
          role: p.role,
          status: "active",
          invited_by: account.id,
          via_dashboard_member_id: id,
        });
        // They may already have their own access to this profile; that stays as it is.
        if (insErr && insErr.code !== "23505") console.error("grant access", insErr.message);
      }
    }
  }
  refresh();
  updateTag("profiles");
  return { ok: true, message: "Access saved.", attempt: Date.now() };
}

/** Remove a member (they lose access at once), or cancel an invitation. */
export async function removeMember(form: FormData): Promise<void> {
  const account = await requireAccount();
  if (account.is_suspended) return;
  const id = text(form.get("member_id"));
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("dashboard_members").select("status").eq("id", id).maybeSingle();
  const status = (data as { status: string } | null)?.status;
  if (!status) return;
  const { error } =
    status === "active"
      ? await supabase.from("dashboard_members").update({ status: "removed" }).eq("id", id)
      : await supabase.from("dashboard_members").delete().eq("id", id);
  if (error) console.error("removeMember", error.message);
  refresh();
  updateTag("profiles");
}

/** Send an invitation again: a new link, valid for 7 more days. */
export async function resendInvite(form: FormData): Promise<void> {
  const account = await requireAccount();
  if (account.is_suspended) return;
  const id = text(form.get("member_id"));
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("dashboard_members").update({ token: crypto.randomUUID(), status: "invited" }).eq("id", id).in("status", ["invited", "expired"]);
  if (error) console.error("resendInvite", error.message);
  refresh();
}

export type AnswerState = { message?: string };

const ANSWERS: Record<string, string> = {
  signin: "Please sign in first.",
  suspended: "This account is suspended.",
  not_found: "This invitation is no longer open.",
  expired: "This invitation has expired. Ask for a new one.",
  own: "This is your own invitation.",
  wrong_email: "This invitation was sent to another email. Sign in with that email to accept it.",
};

/** The invited person accepts or declines. */
export async function answerInvite(_prev: AnswerState, form: FormData): Promise<AnswerState> {
  await requireAccount();
  const token = text(form.get("token"));
  if (!UUID.test(token)) return { message: ANSWERS.not_found };
  const accept = text(form.get("answer")) === "accept";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("answer_team_invite", { p_token: token, p_accept: accept });
  if (error) {
    console.error("answer_team_invite", error.message);
    return { message: "Something went wrong. Please try again." };
  }
  if (data !== "ok") return { message: ANSWERS[data as string] ?? ANSWERS.not_found };
  refresh();
  updateTag("profiles");
  redirect(accept ? "/dashboard?team=joined" : "/dashboard?team=declined");
}
