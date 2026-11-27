"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isSignal } from "@/lib/admin-shows";
import { requireSuperAdmin } from "@/lib/data/admin";
import { photoError, text, UUID } from "@/lib/profile-server";
import { uploadPoster } from "@/lib/show-server";
import { createClient } from "@/lib/supabase/server";

/** Admin Shows and tours (spec 11.5 item 4). Each action runs a database function that checks the super admin again. */

const SHOW_STATUSES = ["draft", "pending", "published", "sold_out", "cancelled"];
const CONTENT_KINDS = ["tour", "podcast", "venue"];

/** Back to the same list, with a message. */
function back(form: FormData, msg: string) {
  const ret = text(form.get("ret"));
  // Venue statuses can also be changed from the old Settings venue list (links kept working).
  const settings = ret.startsWith("/admin/settings");
  const base = ret.startsWith("/admin/shows") || settings ? ret : "/admin/shows";
  const u = new URL(base, "http://x");
  u.searchParams.set("msg", settings && msg === "saved" ? "venue_status" : msg);
  redirect(`${u.pathname}?${u.searchParams}${settings ? "#locations" : ""}`);
}

async function run(fn: string, args: Record<string, unknown>): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(fn, error.message);
    return null;
  }
  refresh();
  updateTag("shows");
  updateTag("tours");
  updateTag("profiles");
  return String(data);
}

const ids = (form: FormData) => form.getAll("ids").map(text).filter((v) => UUID.test(v)).slice(0, 300);

/** One show (inline selector) or several (bulk). */
export async function setShowSignal(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const list = ids(form);
  const signal = text(form.get("signal"));
  if (list.length === 0) return back(form, "none_picked");
  if (!isSignal(signal)) return back(form, "error");
  const r = await run("admin_set_show_signal", { p_ids: list, p_signal: signal });
  back(form, r && Number(r) > 0 ? "saved" : "error");
}

export async function declineSignalRequest(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_decline_signal_request", { p_id: id });
  back(form, r === "ok" ? "declined" : "error");
}

export async function setShowStatus(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const list = ids(form);
  const status = text(form.get("status"));
  if (list.length === 0) return back(form, "none_picked");
  if (!SHOW_STATUSES.includes(status)) return back(form, "error");
  const r = await run("admin_set_show_status", { p_ids: list, p_status: status });
  back(form, r && Number(r) > 0 ? "saved" : "error");
}

export async function setTicketLink(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_set_ticket_link", { p_id: id, p_url: text(form.get("ticket_url")).trim() });
  back(form, r === "ok" ? "saved" : r === "bad_url" ? "bad_url" : "error");
}

export async function setContentStatus(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const kind = text(form.get("kind"));
  const id = text(form.get("id"));
  if (!CONTENT_KINDS.includes(kind) || !UUID.test(id)) return;
  const r = await run("admin_set_content_status", { p_kind: kind, p_id: id, p_status: text(form.get("status")) });
  back(form, r === "ok" ? "saved" : "error");
}

/** Ticked tour dates drop their own poster and show the tour poster again. */
export async function applyTourPoster(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const list = ids(form);
  if (list.length === 0) return back(form, "none_picked");
  const r = await run("admin_use_tour_poster", { p_ids: list });
  back(form, r === null ? "error" : "tour_poster");
}

/**
 * Tours tab > pencil: the tour name and poster, once for the whole tour.
 * Its dates show the tour poster unless they have their own.
 */
export async function quickEditTour(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return back(form, "error");
  const name = text(form.get("name")).trim();
  if (!name || name.length > 120) return back(form, "tour_bad_name");
  const { file, error } = photoError(form, "poster");
  if (error) return back(form, "tour_bad_poster");

  let posterUrl: string | null = null;
  if (file) {
    const supabase = await createClient();
    const { data } = await supabase.from("tours").select("comedian_id, group_id").eq("id", id).maybeSingle();
    const t = data as { comedian_id: string | null; group_id: string | null } | null;
    if (!t) return back(form, "error");
    const performer = t.group_id ? { kind: "group" as const, id: t.group_id } : { kind: "comedian" as const, id: t.comedian_id! };
    posterUrl = await uploadPoster(supabase, performer, `tour-${id}`, file);
    if (!posterUrl) return back(form, "tour_poster_failed");
  }
  const r = await run("admin_update_tour", { p_id: id, p_name: name, p_poster_url: posterUrl });
  back(form, r === "ok" ? "tour_saved" : r === "bad_name" ? "tour_bad_name" : "error");
}
