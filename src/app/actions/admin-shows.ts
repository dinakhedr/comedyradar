"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isSignal } from "@/lib/admin-shows";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Admin Shows and tours (spec 11.5 item 4). Each action runs a database function that checks the super admin again. */

const SHOW_STATUSES = ["draft", "pending", "published", "sold_out", "cancelled"];
const CONTENT_KINDS = ["tour", "podcast", "venue"];

/** Back to the same list, with a message. */
function back(form: FormData, msg: string) {
  const ret = text(form.get("ret"));
  const base = ret.startsWith("/admin/shows") ? ret : "/admin/shows";
  const u = new URL(base, "http://x");
  u.searchParams.set("msg", msg);
  redirect(`${u.pathname}?${u.searchParams}`);
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
