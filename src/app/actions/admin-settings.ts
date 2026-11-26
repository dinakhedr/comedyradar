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

/** Adds a published venue to a city: name, optional website, Google Maps link. */
export async function addVenue(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const back = (msg: string) =>
    redirect(`/admin/settings?msg=${msg}#locations`);
  let city = text(form.get("city_id"));
  const newCity = text(form.get("new_city"))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (newCity) {
    // A city that is not in the list yet: add it first (or use it if it already exists).
    const country = text(form.get("new_city_country"));
    if (!UUID.test(country)) return back("venue_city");
    const added = await run("admin_add_city", {
      p_country_id: country,
      p_name: newCity,
    });
    if (added !== "ok" && added !== "exists") return back("venue_city");
    const slug = newCity
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const supabase = await createClient();
    const { data } = await supabase
      .from("cities")
      .select("id, name, slug")
      .eq("country_id", country);
    const found = (data ?? []).find(
      (c: { slug: string; name: string }) =>
        c.slug === slug || c.name.toLowerCase() === newCity.toLowerCase(),
    ) as { id: string } | undefined;
    if (!found) return back("venue_city");
    city = found.id;
  }
  if (!UUID.test(city)) return back("venue_city");
  const r = await run("admin_add_venue", {
    p_city_id: city,
    p_name: text(form.get("name")).slice(0, 140),
    p_website: text(form.get("website")).trim().slice(0, 500) || null,
    p_map_url: text(form.get("map_url")).trim().slice(0, 500),
  });
  back(
    r === "ok"
      ? newCity
        ? "venue_city_added"
        : "venue_added"
      : r === "exists"
        ? "venue_exists"
        : r === "bad_value"
          ? "venue_bad"
          : "error",
  );
}
