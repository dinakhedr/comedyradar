"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Review queue decisions (spec 11.5 item 2). Each one runs a database function that checks the super admin again. */

function back(form: FormData, result: string) {
  const tab = text(form.get("tab")) || "all";
  const q = new URLSearchParams();
  if (tab !== "all") q.set("tab", tab);
  q.set("done", result === "ok" ? "saved" : "gone");
  redirect(`/admin/review?${q}`);
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
  updateTag("shows");
  return String(data);
}

export async function decideClaim(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const decision = text(form.get("decision"));
  if (!UUID.test(id) || !["admin", "moderator", "more_proof", "reject"].includes(decision)) return;
  const r = await run("admin_decide_claim", {
    p_id: id,
    p_decision: decision,
    p_verify: form.get("verify") === "yes",
    p_reason: text(form.get("reason")),
    p_note: text(form.get("note")),
  });
  back(form, r);
}

export async function decideProfile(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const kind = text(form.get("kind"));
  if (!UUID.test(id) || !["comedian", "group"].includes(kind)) return;
  const r = await run("admin_decide_profile", { p_kind: kind, p_id: id, p_approve: text(form.get("decision")) === "approve", p_verify: form.get("verify") === "yes" });
  back(form, r);
}

export async function decideShow(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_decide_show", { p_id: id, p_approve: text(form.get("decision")) === "approve" });
  back(form, r);
}

export async function decideVenue(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_decide_venue", { p_id: id, p_approve: text(form.get("decision")) === "approve" });
  back(form, r);
}

export async function decideNameChange(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_decide_name_change", { p_id: id, p_approve: text(form.get("decision")) === "approve", p_reason: text(form.get("reason")) });
  back(form, r);
}
