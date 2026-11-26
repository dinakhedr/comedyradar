"use server";

import { updateTag } from "next/cache";
import { getMyProfiles, requireAccount } from "@/lib/data/dashboard";
import { checkPodcast, PODCAST_LINKS, type PodcastErrors, type PodcastLink, type ProfileErrors, type ProfileKind } from "@/lib/profile-forms";
import { addMembers, freeSlug, photoError, readProfileForm, text, uploadImage, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Edit profile (spec 11.4 item 5). The database rules check every change again. */

/** The profile from the form, when this account is one of its admins. */
async function adminProfile(form: FormData) {
  const account = await requireAccount();
  if (account.is_suspended) return null;
  const kind: ProfileKind = text(form.get("kind")) === "group" ? "group" : "comedian";
  const id = text(form.get("profile_id"));
  if (!UUID.test(id)) return null;
  const p = (await getMyProfiles()).find((x) => x.kind === kind && x.id === id);
  return p && p.role === "admin" ? { ...p, account } : null;
}

const NOT_ADMIN = "Only an admin of this profile can change it.";

export type EditState = { ok?: boolean; message?: string; errors?: ProfileErrors & { photo?: string }; attempt?: number };

export async function updateProfile(_prev: EditState, form: FormData): Promise<EditState> {
  const p = await adminProfile(form);
  if (!p) return { message: NOT_ADMIN };
  const { values, errors } = readProfileForm(form, p.kind);
  const { file, error: photoErr } = photoError(form, "photo");
  if (!values || photoErr) {
    return { errors: { ...errors, ...(photoErr ? { photo: photoErr } : {}) }, message: "Please check the highlighted fields." };
  }

  const supabase = await createClient();
  const table = p.kind === "group" ? "comedy_groups" : "comedians";
  const update: Record<string, unknown> = { ...values };
  if (file) {
    const url = await uploadImage(supabase, p.kind === "group" ? "groups" : "comedians", p.id, "photo", file);
    if (!url) return { errors: { photo: "We couldn't upload the photo. Please try again." }, message: "Please check the highlighted fields." };
    update.photo_url = url;
  } else if (form.get("remove_photo") === "on") {
    update.photo_url = null;
  }

  const { data, error } = await supabase.from(table).update(update).eq("id", p.id).select("name, name_ar").single();
  if (error || !data) {
    console.error("updateProfile", error?.message);
    return { message: "We couldn't save your changes. Please try again." };
  }
  updateTag("profiles");
  const saved = data as { name: string; name_ar: string | null };
  const nameWaits = saved.name !== values.name || (saved.name_ar ?? null) !== values.name_ar;
  return {
    ok: true,
    attempt: Date.now(),
    message: nameWaits
      ? "Changes saved. Your new name will show once Comedy Radar approves it, because this profile is verified."
      : "Changes saved.",
  };
}

/** "Request archive" and "Cancel request". Only the super admin archives or deletes. */
export async function setArchiveRequest(form: FormData): Promise<void> {
  const p = await adminProfile(form);
  if (!p) return;
  const supabase = await createClient();
  const table = p.kind === "group" ? "comedy_groups" : "comedians";
  const on = text(form.get("request")) === "on";
  const { error } = await supabase.from(table).update({ archive_requested_at: on ? new Date().toISOString() : null }).eq("id", p.id);
  if (error) console.error("setArchiveRequest", error.message);
  updateTag("profiles");
}

/** Send a draft for review, or take a profile in review back to draft. */
export async function setProfileStatus(form: FormData): Promise<void> {
  const p = await adminProfile(form);
  if (!p) return;
  const to = text(form.get("to"));
  if (!((to === "pending" && p.status === "draft") || (to === "draft" && p.status === "pending"))) return;
  const supabase = await createClient();
  const { error } = await supabase.from(p.kind === "group" ? "comedy_groups" : "comedians").update({ status: to }).eq("id", p.id);
  if (error) console.error("setProfileStatus", error.message);
  updateTag("profiles");
}

// ---------------------------------------------------------------------------
// Group members
// ---------------------------------------------------------------------------

export type MembersState = { message?: string; ok?: boolean; attempt?: number };

export async function addGroupMembers(_prev: MembersState, form: FormData): Promise<MembersState> {
  const p = await adminProfile(form);
  if (!p || p.kind !== "group") return { message: NOT_ADMIN };
  const supabase = await createClient();
  const { count } = await supabase.from("group_members").select("comedian_id", { count: "exact", head: true }).eq("group_id", p.id);
  const added = await addMembers(supabase, p.account.id, p.id, form, (count ?? 0) + 1);
  updateTag("profiles");
  if (!added) return { message: "No one was added. Pick a comedian from the search, or type a new name.", attempt: Date.now() };
  return { ok: true, message: added === 1 ? "1 member added." : `${added} members added.`, attempt: Date.now() };
}

export async function removeGroupMember(form: FormData): Promise<void> {
  const p = await adminProfile(form);
  const comedianId = text(form.get("comedian_id"));
  if (!p || p.kind !== "group" || !UUID.test(comedianId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("group_members").delete().eq("group_id", p.id).eq("comedian_id", comedianId);
  if (error) console.error("removeGroupMember", error.message);
  // A request still waiting for an answer is withdrawn too.
  await supabase
    .from("link_requests")
    .delete()
    .eq("type", "group_member")
    .eq("group_id", p.id)
    .eq("target_comedian_id", comedianId)
    .eq("status", "pending");
  updateTag("profiles");
}

// ---------------------------------------------------------------------------
// Podcasts (comedians only)
// ---------------------------------------------------------------------------

export type PodcastState = { ok?: boolean; message?: string; errors?: PodcastErrors & { cover?: string }; attempt?: number };

export async function savePodcast(_prev: PodcastState, form: FormData): Promise<PodcastState> {
  const p = await adminProfile(form);
  if (!p || p.kind !== "comedian") return { message: NOT_ADMIN };
  const links = Object.fromEntries(PODCAST_LINKS.map((l) => [l.key, text(form.get(l.key))])) as Record<PodcastLink, string>;
  const { values, errors } = checkPodcast({ name: text(form.get("name")), description: text(form.get("description")), links });
  const { file, error: coverErr } = photoError(form, "cover");
  if (!values || coverErr) return { errors: { ...errors, ...(coverErr ? { cover: coverErr } : {}) }, message: "Please check the highlighted fields." };

  const supabase = await createClient();
  let podcastId = text(form.get("podcast_id"));
  if (podcastId) {
    if (!UUID.test(podcastId)) return { message: "We couldn't find this podcast." };
    const { error } = await supabase.from("podcasts").update(values).eq("id", podcastId);
    if (error) {
      console.error("savePodcast", error.message);
      return { message: "We couldn't save the podcast. Please try again." };
    }
  } else {
    const { slug } = await freeSlug(supabase, "podcasts", values.name, "podcast");
    const { data, error } = await supabase
      .from("podcasts")
      .insert({ ...values, slug, created_by: p.account.id })
      .select("id")
      .single();
    if (error || !data) {
      console.error("savePodcast", error?.message);
      return { message: "We couldn't save the podcast. Please try again." };
    }
    podcastId = (data as { id: string }).id;
    const { error: hostErr } = await supabase.from("podcast_hosts").insert({ podcast_id: podcastId, comedian_id: p.id, display_order: 1 });
    if (hostErr) console.error("podcast host", hostErr.message);
  }

  if (file) {
    const url = await uploadImage(supabase, "podcasts", podcastId, "cover", file);
    if (url) await supabase.from("podcasts").update({ cover_url: url }).eq("id", podcastId);
  }

  // Co-hosts: they show once their own admin accepts (spec 11.3, consent).
  const cohosts = [...new Set(form.getAll("member_ids").map(String))].filter((id) => UUID.test(id) && id !== p.id).slice(0, 10);
  if (cohosts.length) {
    const { count } = await supabase.from("podcast_hosts").select("comedian_id", { count: "exact", head: true }).eq("podcast_id", podcastId);
    const { data: rows, error } = await supabase
      .from("podcast_hosts")
      .upsert(
        cohosts.map((comedian_id, i) => ({ podcast_id: podcastId, comedian_id, display_order: (count ?? 1) + i + 1 })),
        { onConflict: "podcast_id,comedian_id", ignoreDuplicates: true },
      )
      .select("comedian_id, link_status");
    if (error) console.error("podcast cohosts", error.message);
    const pending = ((rows ?? []) as { comedian_id: string; link_status: string }[]).filter((r) => r.link_status === "pending");
    if (pending.length) {
      const { error: reqErr } = await supabase.from("link_requests").insert(
        pending.map((r) => ({ type: "podcast_cohost", from_account_id: p.account.id, target_comedian_id: r.comedian_id, podcast_id: podcastId })),
      );
      if (reqErr) console.error("cohost requests", reqErr.message);
    }
  }

  updateTag("profiles");
  return { ok: true, message: "Podcast saved.", attempt: Date.now() };
}

/** Takes this comedian off a podcast (the podcast stays for its other hosts). */
export async function leavePodcast(form: FormData): Promise<void> {
  const p = await adminProfile(form);
  const podcastId = text(form.get("podcast_id"));
  if (!p || p.kind !== "comedian" || !UUID.test(podcastId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("podcast_hosts").delete().eq("podcast_id", podcastId).eq("comedian_id", p.id);
  if (error) console.error("leavePodcast", error.message);
  updateTag("profiles");
}
