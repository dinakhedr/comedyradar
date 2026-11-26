"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { cairoInputToIso, intIn, isCurrency } from "@/lib/admin-spotlight";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Admin Spotlight (spec 11.5 item 6). Each action runs a database function that checks the super admin again. */

function back(msg: string, extra: Record<string, string> = {}) {
  const u = new URLSearchParams({ ...extra, msg });
  redirect(`/admin/spotlight?${u}`);
}

async function run(fn: string, args: Record<string, unknown>): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(fn, error.message);
    return "error";
  }
  refresh();
  updateTag("spotlight");
  updateTag("site-settings");
  return String(data);
}

export async function savePlacement(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const show = text(form.get("show_id"));
  if (!UUID.test(show)) return back("no_show");
  const paid = form.get("is_paid") === "yes";
  const amount = Number(text(form.get("amount")).replace(",", "."));
  const currency = text(form.get("currency"));
  const r = await run("admin_save_placement", {
    p_id: UUID.test(id) ? id : null,
    p_show_id: show,
    p_starts_at: cairoInputToIso(text(form.get("starts_at"))),
    p_ends_at: cairoInputToIso(text(form.get("ends_at"))),
    p_priority: intIn(text(form.get("priority")), 0, 1000, 0),
    p_preferred_slide: intIn(text(form.get("preferred_slide")), 1, 5, null),
    p_is_paid: paid,
    p_amount: paid && Number.isFinite(amount) && amount >= 0 ? amount : null,
    p_currency: isCurrency(currency) ? currency : "EGP",
    p_client: text(form.get("client")).slice(0, 120),
    p_notes: text(form.get("notes")).slice(0, 500),
  });
  back(
    r === "ok"
      ? "saved"
      : r === "bad_dates"
        ? "bad_dates"
        : r === "not_found"
          ? "no_show"
          : "error",
  );
}

export async function endPlacement(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const r = await run("admin_end_placement", { p_id: id });
  back(r === "ended" || r === "removed" ? r : "error");
}

export async function movePlacement(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const dir = text(form.get("dir"));
  if (!UUID.test(id) || (dir !== "up" && dir !== "down")) return;
  const r = await run("admin_move_placement", { p_id: id, p_dir: dir });
  back(r === "ok" ? "moved" : "error");
}

export async function saveCarouselSettings(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const r = await run("admin_spotlight_settings", {
    p_slides: intIn(text(form.get("slides")), 1, 5, 5),
    p_seconds: intIn(text(form.get("seconds")), 3, 20, 6),
  });
  back(r === "ok" ? "settings" : "error");
}
