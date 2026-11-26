"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Admin Settings (spec 11.5 item 8). Each action runs a database function that checks the super admin and the limits again. */

const NUMBER_KEYS = ["coming_up_count", "track_count", "new_signal_days"];

async function run(fn: string, args: Record<string, unknown>): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(fn, error.message);
    return "error";
  }
  refresh();
  updateTag("site-settings");
  updateTag("cities");
  updateTag("shows");
  return String(data);
}

/** Saves the numbers and the default city of one settings card. */
export async function saveSettings(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const section = text(form.get("section")).replace(/[^a-z-]/g, "");
  let result = "ok";
  for (const key of NUMBER_KEYS) {
    const raw = text(form.get(key)).trim();
    if (!raw) continue;
    if (!/^\d{1,3}$/.test(raw)) {
      result = "bad_value";
      continue;
    }
    const r = await run("admin_save_setting", {
      p_key: key,
      p_value: Number(raw),
    });
    if (r !== "ok") result = r;
  }
  const city = text(form.get("default_city")).trim();
  if (city) {
    const r = await run("admin_save_setting", {
      p_key: "default_city",
      p_value: city,
    });
    if (r !== "ok") result = r;
  }
  redirect(
    `/admin/settings?msg=${result === "ok" ? "saved" : result === "bad_value" ? "bad_value" : "error"}#${section || "homepage"}`,
  );
}

export async function addCity(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const country = text(form.get("country_id"));
  if (!UUID.test(country)) return;
  const r = await run("admin_add_city", {
    p_country_id: country,
    p_name: text(form.get("name")).slice(0, 80),
  });
  redirect(
    `/admin/settings?msg=${r === "ok" ? "city_added" : r === "exists" ? "city_exists" : r === "bad_value" ? "bad_value" : "error"}#locations`,
  );
}
