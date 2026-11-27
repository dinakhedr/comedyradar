import "server-only";
import { headers } from "next/headers";
import { checkProfile, nextSlug, slugify, type ProfileKind, type Social } from "@/lib/profile-forms";
import { createClient } from "@/lib/supabase/server";

/** Server helpers shared by the profile actions (create, claim, edit). Not actions themselves. */

type Db = Awaited<ReturnType<typeof createClient>>;

export const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE = 10 * 1024 * 1024;

/** The address of this site, for links (production or preview). */
export async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** The profile fields of a create or edit form, checked. */
export function readProfileForm(form: FormData, kind: ProfileKind) {
  const socials = Object.fromEntries(
    (["instagram", "tiktok", "youtube", "facebook"] as Social[]).map((k) => [k, text(form.get(k))]),
  ) as Record<Social, string>;
  return checkProfile({
    kind,
    name: text(form.get("name")),
    name_ar: text(form.get("name_ar")),
    bio: text(form.get("bio")),
    country: text(form.get("country")),
    socials,
    styles: form.getAll("styles").map(String),
    language: text(form.get("language")),
  });
}

/** The uploaded image of a form field (or null), and what is wrong with it. */
export function photoError(form: FormData, field: string): { file: File | null; error: string | null } {
  const v = form.get(field);
  const file = v instanceof File && v.size > 0 ? v : null;
  const error = !file
    ? null
    : !IMAGE_TYPES[file.type]
      ? "Please use a JPG, PNG or WebP image."
      : file.size > MAX_IMAGE
        ? "The image is larger than 10 MB."
        : null;
  return { file, error };
}

/** Uploads an image to `<bucket>/<id>/<name>-<time>.<ext>` and returns its public address. */
export async function uploadImage(db: Db, bucket: "comedians" | "groups" | "podcasts", id: string, name: string, file: File) {
  const path = `${id}/${name}-${Date.now()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("upload", bucket, error.message);
    return null;
  }
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** A free slug in a table, from a name. */
export async function freeSlug(db: Db, table: "comedians" | "comedy_groups" | "podcasts", name: string, fallback: string) {
  const base = slugify(name, fallback);
  const { data: taken } = await db.from(table).select("slug").like("slug", `${base}%`).limit(200);
  return { base, slug: nextSlug(base, ((taken ?? []) as { slug: string }[]).map((r) => r.slug)) };
}

/**
 * Group members from a form: existing comedians (`member_ids`) and new names
 * (`new_members`, one per line, saved as draft comedians). Members this account
 * does not manage get a link request and show once their admin accepts (spec 11.3).
 */
export async function addMembers(
  db: Db,
  accountId: string,
  groupId: string,
  form: FormData,
  startOrder = 1,
  newStatus = "draft",
): Promise<{ count: number; created: string[] }> {
  const existing = [...new Set(form.getAll("member_ids").map(String).filter((v) => UUID.test(v)))].slice(0, 20);
  const newNames = text(form.get("new_members"))
    .split("\n")
    .map((n) => n.trim().replace(/\s+/g, " "))
    .filter((n) => n.length >= 2 && n.length <= 80 && /[A-Za-z]/.test(n))
    .slice(0, 20);

  const created: string[] = [];
  for (const name of newNames) {
    const { slug } = await freeSlug(db, "comedians", name, "comedian");
    const { data, error } = await db.from("comedians").insert({ name, slug, status: newStatus }).select("id").single();
    if (error) console.error("member draft", error.message);
    if (data) created.push((data as { id: string }).id);
  }

  const all = [...existing, ...created];
  if (!all.length) return { count: 0, created };
  const { data: rows, error } = await db
    .from("group_members")
    .upsert(
      all.map((comedian_id, i) => ({ group_id: groupId, comedian_id, display_order: startOrder + i })),
      { onConflict: "group_id,comedian_id", ignoreDuplicates: true },
    )
    .select("comedian_id, link_status");
  if (error) {
    console.error("group members", error.message);
    return { count: 0, created };
  }
  const pending = ((rows ?? []) as { comedian_id: string; link_status: string }[]).filter((r) => r.link_status === "pending");
  if (pending.length) {
    const { error: reqErr } = await db.from("link_requests").insert(
      pending.map((r) => ({ type: "group_member", from_account_id: accountId, target_comedian_id: r.comedian_id, group_id: groupId })),
    );
    if (reqErr) console.error("link requests", reqErr.message);
  }
  return { count: rows?.length ?? 0, created };
}
