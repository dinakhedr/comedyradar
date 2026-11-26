"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Admin Profiles (spec 11.5 item 3). Each action runs a database function that checks the super admin again. */

const KINDS = ["comedian", "group"];

/** Back to the same list and profile, with a message. */
function back(form: FormData, msg: string) {
  const ret = text(form.get("ret"));
  const base = ret.startsWith("/admin/profiles") ? ret : "/admin/profiles";
  const u = new URL(base, "http://x");
  u.searchParams.set("msg", msg);
  redirect(`${u.pathname}?${u.searchParams}`);
}

async function run(fn: string, args: Record<string, unknown>): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(fn, error.message);
    return "error";
  }
  refresh();
  updateTag("profiles");
  return String(data);
}

export async function setProfileStatus(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const kind = text(form.get("kind"));
  const id = text(form.get("id"));
  if (!KINDS.includes(kind) || !UUID.test(id)) return;
  const r = await run("admin_set_profile", { p_kind: kind, p_id: id, p_status: text(form.get("status")), p_verified: form.get("verified") === "yes" });
  back(form, r === "ok" ? "saved" : "error");
}

export async function grantAccess(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const kind = text(form.get("kind"));
  const id = text(form.get("id"));
  if (!KINDS.includes(kind) || !UUID.test(id)) return;
  const r = await run("admin_grant_access", { p_kind: kind, p_id: id, p_email: text(form.get("email")).trim(), p_role: text(form.get("role")) });
  back(form, r === "ok" ? "added" : r === "no_account" ? "no_account" : "error");
}

export async function changeAccess(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("access_id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_change_access", { p_access_id: id, p_role: text(form.get("role")) });
  back(form, r === "ok" ? "saved" : "error");
}
