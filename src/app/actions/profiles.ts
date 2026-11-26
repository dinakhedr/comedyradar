"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import {
  checkClaim,
  checkProfile,
  AVAILABLE_PROOFS,
  nextSlug,
  slugify,
  type ClaimErrors,
  type ProfileErrors,
  type ProfileKind,
  type Social,
} from "@/lib/profile-forms";
import { requireAccount } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export type FoundProfile = {
  kind: ProfileKind;
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  photo_url: string | null;
  status: "published" | "pending";
  has_admin: boolean;
  score: number;
};

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO = 10 * 1024 * 1024;

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Profiles with a similar English or Arabic name (published or in review). */
export async function findProfiles(q: string): Promise<FoundProfile[]> {
  await requireAccount();
  const query = q.trim().slice(0, 80);
  if (query.replace(/\s+/g, "").length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_profiles", { q: query });
  if (error) console.error("find_profiles", error.message);
  return (data ?? []) as FoundProfile[];
}

/** Comedians for the group member picker. */
export async function findComedians(q: string): Promise<{ id: string; name: string; status: string }[]> {
  return (await findProfiles(q)).filter((p) => p.kind === "comedian").map((p) => ({ id: p.id, name: p.name, status: p.status }));
}

// ---------------------------------------------------------------------------
// Create a profile
// ---------------------------------------------------------------------------

export type CreateState = {
  message?: string;
  errors?: ProfileErrors & { photo?: string };
  duplicates?: FoundProfile[];
  /** What was typed, so the form keeps it after an error. */
  input?: { fields: Record<string, string>; styles: string[]; members: { id: string; name: string }[] };
  /** Changes on every answer, so the form shows the values again. */
  attempt?: number;
};

function echo(form: FormData): NonNullable<CreateState["input"]> {
  const fields: Record<string, string> = {};
  for (const k of ["name", "name_ar", "bio", "country", "instagram", "tiktok", "youtube", "facebook", "language", "new_members"]) {
    fields[k] = text(form.get(k)).slice(0, 2000);
  }
  const ids = form.getAll("member_ids").map(String);
  const names = form.getAll("member_names").map(String);
  return {
    fields,
    styles: form.getAll("styles").map(String),
    members: ids.filter((id) => UUID.test(id)).slice(0, 20).map((id, i) => ({ id, name: (names[i] ?? "").slice(0, 80) })),
  };
}

export async function createProfile(_prev: CreateState, form: FormData): Promise<CreateState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  const kind: ProfileKind = text(form.get("kind")) === "group" ? "group" : "comedian";
  const socials = Object.fromEntries(
    (["instagram", "tiktok", "youtube", "facebook"] as Social[]).map((k) => [k, text(form.get(k))]),
  ) as Record<Social, string>;
  const { values, errors } = checkProfile({
    kind,
    name: text(form.get("name")),
    name_ar: text(form.get("name_ar")),
    bio: text(form.get("bio")),
    country: text(form.get("country")),
    socials,
    styles: form.getAll("styles").map(String),
    language: text(form.get("language")),
  });

  const photo = form.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  const photoErr = file && (!PHOTO_TYPES[file.type] ? "Please use a JPG, PNG or WebP photo." : file.size > MAX_PHOTO ? "The photo is larger than 10 MB." : null);
  if (!values || photoErr) {
    return {
      errors: { ...errors, ...(photoErr ? { photo: photoErr } : {}) },
      message: "Please check the highlighted fields.",
      input: echo(form),
      attempt: Date.now(),
    };
  }

  // Duplicate check on the English and Arabic names (spec 11.3).
  if (form.get("not_duplicate") !== "on") {
    const found = [...(await findProfiles(values.name)), ...(values.name_ar ? await findProfiles(values.name_ar) : [])];
    const close = [...new Map(found.filter((p) => p.kind === kind && p.score >= 0.75).map((p) => [p.id, p])).values()];
    if (close.length) {
      return {
        duplicates: close,
        message: "This looks like a profile that is already on Comedy Radar. Claim it instead, or tick the box to confirm it's someone else.",
        input: echo(form),
        attempt: Date.now(),
      };
    }
  }

  const supabase = await createClient();
  const table = kind === "group" ? "comedy_groups" : "comedians";
  const base = slugify(values.name, kind);
  const { data: taken } = await supabase.from(table).select("slug").like("slug", `${base}%`).limit(200);
  let slug = nextSlug(base, ((taken ?? []) as { slug: string }[]).map((r) => r.slug));
  const status = text(form.get("intent")) === "draft" ? "draft" : "pending";

  let id: string | null = null;
  for (let attempt = 0; attempt < 3 && !id; attempt++) {
    const { data, error } = await supabase.from(table).insert({ ...values, slug, status }).select("id").single();
    if (data) id = (data as { id: string }).id;
    else if (error?.code === "23505") slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    else {
      console.error("createProfile", error?.message);
      return { message: "We couldn't save the profile. Please try again.", input: echo(form), attempt: Date.now() };
    }
  }
  if (!id) return { message: "We couldn't save the profile. Please try again." };

  // Photo: saved after the profile exists, because the folder is named after it.
  if (file) {
    const path = `${id}/photo-${Date.now()}.${PHOTO_TYPES[file.type]}`;
    const bucket = kind === "group" ? "groups" : "comedians";
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) console.error("profile photo", error.message);
    else {
      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      await supabase.from(table).update({ photo_url: url }).eq("id", id);
    }
  }

  if (kind === "group") await addMembers(supabase, account.id, id, form);

  updateTag("profiles");
  redirect(`/dashboard/profiles?created=${kind === "group" ? "g" : "c"}:${slug}`);
}

/** Group members: existing comedians (a link request when someone else manages them) and new drafts. */
async function addMembers(supabase: Awaited<ReturnType<typeof createClient>>, accountId: string, groupId: string, form: FormData) {
  const existing = [...new Set(form.getAll("member_ids").map(String).filter((v) => UUID.test(v)))].slice(0, 20);
  const newNames = text(form.get("new_members"))
    .split("\n")
    .map((n) => n.trim().replace(/\s+/g, " "))
    .filter((n) => n.length >= 2 && n.length <= 80 && /[A-Za-z]/.test(n))
    .slice(0, 20);

  const created: string[] = [];
  for (const name of newNames) {
    const base = slugify(name, "comedian");
    const { data: taken } = await supabase.from("comedians").select("slug").like("slug", `${base}%`).limit(200);
    const slug = nextSlug(base, ((taken ?? []) as { slug: string }[]).map((r) => r.slug));
    const { data, error } = await supabase.from("comedians").insert({ name, slug, status: "draft" }).select("id").single();
    if (error) console.error("member draft", error.message);
    if (data) created.push((data as { id: string }).id);
  }

  const all = [...existing, ...created];
  if (!all.length) return;
  const { data: rows, error } = await supabase
    .from("group_members")
    .insert(all.map((comedian_id, i) => ({ group_id: groupId, comedian_id, display_order: i + 1 })))
    .select("comedian_id, link_status");
  if (error) {
    console.error("group members", error.message);
    return;
  }
  // Members this account does not manage wait for their admin's answer (spec 11.3, consent).
  const pending = ((rows ?? []) as { comedian_id: string; link_status: string }[]).filter((r) => r.link_status === "pending");
  if (pending.length) {
    const { error: reqErr } = await supabase.from("link_requests").insert(
      pending.map((r) => ({ type: "group_member", from_account_id: accountId, target_comedian_id: r.comedian_id, group_id: groupId })),
    );
    if (reqErr) console.error("link requests", reqErr.message);
  }
}

// ---------------------------------------------------------------------------
// Claim a profile
// ---------------------------------------------------------------------------

export type ClaimState = { message?: string; errors?: ClaimErrors; done?: { method: string; confirmUrl?: string; handle?: string } };

export async function claimProfile(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  const kind: ProfileKind = text(form.get("kind")) === "group" ? "group" : "comedian";
  const profileId = text(form.get("profile_id"));
  if (!UUID.test(profileId)) return { message: "We couldn't find this profile." };

  const doc = form.get("document");
  const file = doc instanceof File && doc.size > 0 ? doc : null;
  const method = text(form.get("method"));
  const { errors, proofValue } = checkClaim(
    kind,
    { relation: text(form.get("relation")), method, proof: text(form.get(`proof_${method}`)), file: file ? { size: file.size, type: file.type } : null },
    AVAILABLE_PROOFS,
  );
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted fields." };

  const supabase = await createClient();
  const table = kind === "group" ? "comedy_groups" : "comedians";
  const { data: profile } = await supabase.from(table).select("id, status").eq("id", profileId).eq("status", "published").maybeSingle();
  if (!profile) return { message: "We couldn't find this profile." };

  const column = kind === "group" ? "group_id" : "comedian_id";
  const { data: open } = await supabase
    .from("access_requests")
    .select("id")
    .eq("account_id", account.id)
    .eq("type", "claim")
    .eq("status", "pending")
    .eq(column, profileId)
    .limit(1);
  if (open?.length) return { message: "You already sent a claim for this profile. We will let you know when it is reviewed." };

  let proofPath: string | null = null;
  if (method === "document" && file) {
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    proofPath = `${account.id}/${profileId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("claim-documents").upload(proofPath, file, { contentType: file.type });
    if (error) {
      console.error("claim document", error.message);
      return { errors: { file: "We couldn't upload the document. Please try again." } };
    }
  }

  const { data: row, error } = await supabase
    .from("access_requests")
    .insert({
      type: "claim",
      account_id: account.id,
      [column]: profileId,
      role: "admin",
      relation: text(form.get("relation")),
      proof_method: method,
      proof_value: proofValue,
      proof_file_path: proofPath,
    })
    .select("confirm_token")
    .single();
  if (error || !row) {
    console.error("claimProfile", error?.message);
    return { message: "We couldn't send your claim. Please try again." };
  }

  const token = (row as { confirm_token: string | null }).confirm_token;
  return {
    done: {
      method,
      confirmUrl: method === "comedian_confirms" && token ? `${await origin()}/claim/confirm/${token}` : undefined,
      handle: method === "official_dm" ? (proofValue ?? undefined) : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// "The comedian confirms" link (public, no account needed)
// ---------------------------------------------------------------------------

export type ConfirmState = { ok?: boolean; message?: string };

export async function confirmClaim(_prev: ConfirmState, form: FormData): Promise<ConfirmState> {
  const token = text(form.get("token"));
  const name = text(form.get("name")).trim();
  if (!UUID.test(token)) return { message: "This link is not valid." };
  if (name.length < 2) return { message: "Please type your name." };
  const { createPublicClient } = await import("@/lib/supabase/public");
  const db = createPublicClient();
  if (!db) return { message: "Please try again later." };
  const { data, error } = await db.rpc("confirm_claim", { p_token: token, p_name: name.slice(0, 80) });
  if (error) console.error("confirm_claim", error.message);
  return data ? { ok: true } : { message: "This link has expired or was already used." };
}
