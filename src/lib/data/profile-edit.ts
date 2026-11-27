import "server-only";
import type { GroupLanguage, GroupStyle } from "@/lib/group-styles";
import type { ProfileRole } from "@/lib/dashboard";
import type { ProfileKind } from "@/lib/profile-forms";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdminNow } from "./admin";
import { getMyProfiles } from "./dashboard";

/** Data for Edit profile (spec 11.4 item 5). Runs as the signed-in account. */

export type EditableProfile = {
  kind: ProfileKind;
  id: string;
  slug: string;
  role: ProfileRole;
  name: string;
  name_ar: string | null;
  bio: string | null;
  photo_url: string | null;
  cover_url: string | null;
  home_country_id: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  /** Groups only. */
  website_url: string | null;
  styles: GroupStyle[];
  performing_language: GroupLanguage | null;
  status: "draft" | "pending" | "published" | "archived";
  verified: boolean;
  archive_requested_at: string | null;
  pendingName: { name: string; name_ar: string | null; created_at: string } | null;
  panel: { last_edit_at: string | null; last_edit_by: string | null; people: { name: string; role: ProfileRole; me: boolean }[] };
};

export type GroupMember = { comedian_id: string; name: string; slug: string; status: string; link_status: "pending" | "accepted" | "declined" };

export type Podcast = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  apple_podcasts_url: string | null;
  spotify_url: string | null;
  anghami_url: string | null;
  podu_url: string | null;
  youtube_url: string | null;
  canEdit: boolean;
  hosts: { comedian_id: string; name: string; link_status: string }[];
};

/** The profile the account manages with this address, or null. `type=group` picks the group when both exist. */
export async function getEditableProfile(slug: string, type?: string): Promise<EditableProfile | null> {
  const mine = (await getMyProfiles()).filter((p) => p.slug === slug);
  const picked = mine.find((p) => p.kind === (type === "group" ? "group" : "comedian")) ?? mine[0];
  if (!picked) return null;
  return loadEditable(picked);
}

/** Any profile, for the super admin (Admin > Profiles > Edit), with full admin rights. Null for everyone else. */
export async function getProfileForSuperAdmin(kind: ProfileKind, id: string): Promise<EditableProfile | null> {
  if (!(await isSuperAdminNow())) return null;
  return loadEditable({ kind, id, role: "admin" });
}

async function loadEditable(picked: { kind: ProfileKind; id: string; role: ProfileRole }): Promise<EditableProfile | null> {
  const supabase = await createClient();
  const table = picked.kind === "group" ? "comedy_groups" : "comedians";
  const cols =
    "id, slug, name, name_ar, bio, photo_url, cover_url, home_country_id, instagram_url, tiktok_url, youtube_url, facebook_url, status, verified, archive_requested_at" +
    (picked.kind === "group" ? ", styles, performing_language, website_url" : "");
  const column = picked.kind === "group" ? "group_id" : "comedian_id";
  const [row, names, panel] = await Promise.all([
    supabase.from(table).select(cols).eq("id", picked.id).maybeSingle(),
    supabase
      .from("profile_name_changes")
      .select("name, name_ar, created_at")
      .eq(column, picked.id)
      .eq("status", "pending")
      .maybeSingle(),
    supabase.rpc("profile_panel", picked.kind === "group" ? { p_comedian: null, p_group: picked.id } : { p_comedian: picked.id, p_group: null }),
  ]);
  if (row.error) console.error("getEditableProfile", row.error.message);
  if (!row.data) return null;
  const p = row.data as unknown as Omit<EditableProfile, "kind" | "role" | "pendingName" | "panel">;
  const panelRow = ((panel.data ?? []) as EditableProfile["panel"][])[0];
  return {
    ...p,
    styles: p.styles ?? [],
    performing_language: p.performing_language ?? null,
    website_url: p.website_url ?? null,
    kind: picked.kind,
    role: picked.role,
    pendingName: (names.data as EditableProfile["pendingName"]) ?? null,
    panel: panelRow ?? { last_edit_at: null, last_edit_by: null, people: [] },
  };
}

/** Members of a group, with their answer (accepted / waiting / declined). */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("comedian_id, link_status, display_order, comedians(name, slug, status)")
    .eq("group_id", groupId)
    .order("display_order");
  if (error) console.error("getGroupMembers", error.message);
  type Raw = { comedian_id: string; link_status: GroupMember["link_status"]; comedians: { name: string; slug: string; status: string } | null };
  return ((data ?? []) as unknown as Raw[]).map((r) => ({
    comedian_id: r.comedian_id,
    link_status: r.link_status,
    name: r.comedians?.name ?? "A comedian",
    slug: r.comedians?.slug ?? "",
    status: r.comedians?.status ?? "",
  }));
}

/** Podcasts a comedian hosts, with all their hosts. */
export async function getComedianPodcasts(comedianId: string): Promise<Podcast[]> {
  const supabase = await createClient();
  const { data: links, error } = await supabase.from("podcast_hosts").select("podcast_id").eq("comedian_id", comedianId);
  if (error) console.error("getComedianPodcasts", error.message);
  const ids = ((links ?? []) as { podcast_id: string }[]).map((l) => l.podcast_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("podcasts")
    .select(
      "id, name, slug, description, cover_url, apple_podcasts_url, spotify_url, anghami_url, podu_url, youtube_url, " +
        "podcast_hosts(comedian_id, link_status, display_order, comedians(name))",
    )
    .in("id", ids)
    .order("name");
  type Raw = Omit<Podcast, "hosts" | "canEdit"> & {
    podcast_hosts: { comedian_id: string; link_status: string; display_order: number; comedians: { name: string } | null }[];
  };
  return ((data ?? []) as unknown as Raw[]).map(({ podcast_hosts, ...p }) => ({
    ...p,
    canEdit: true,
    hosts: [...(podcast_hosts ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map((h) => ({ comedian_id: h.comedian_id, link_status: h.link_status, name: h.comedians?.name ?? "A comedian" })),
  }));
}
