"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";
import { applyVenueLogo } from "@/lib/venue-logo-server";
import {
  logoChange,
  venueMessage,
  venueValues,
  VENUE_STATUSES,
  type VenueFormState,
} from "@/lib/venue-forms";

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

/** Keeps the country the super admin was working in open after saving. */
const openParam = (form: FormData) => {
  const code = text(form.get("open"));
  return /^[A-Z]{2}$/.test(code) ? `open=${code}&` : "";
};

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
    `/admin/settings?${openParam(form)}msg=${r === "ok" ? "city_added" : r === "exists" ? "city_exists" : r === "bad_value" ? "city_bad" : "error"}#locations`,
  );
}

/** Adds a published venue to a city, from the + beside the city. Returns a message shown in the form. */
export async function addVenue(
  _prev: VenueFormState,
  form: FormData,
): Promise<VenueFormState> {
  await requireSuperAdmin();
  const v = venueValues(form);
  const city = text(form.get("city_id"));
  const cityName = text(form.get("city_name")).slice(0, 80);
  if (!UUID.test(city))
    return { ...venueMessage("error", "add", v.name, cityName), values: v };
  const logo = logoChange(form);
  if (logo.kind === "bad")
    return { ...venueMessage("bad_logo", "add", v.name, cityName), values: v };
  const r = await run("admin_add_venue", {
    p_city_id: city,
    p_name: v.name,
    p_website: v.website || null,
    p_map_url: v.map_url,
    p_instagram: v.instagram || null,
    p_facebook: v.facebook || null,
    p_area: v.area || null,
  });
  if (r === "ok" && logo.kind === "upload") {
    const supabase = await createClient();
    const want = v.name.replace(/\s+/g, " ").toLowerCase();
    const { data } = await supabase
      .from("venues")
      .select("id, name")
      .eq("city_id", city);
    const id = ((data ?? []) as { id: string; name: string }[]).find(
      (x) => x.name.toLowerCase() === want,
    )?.id;
    const done = id ? await applyVenueLogo(supabase, id, logo) : "logo_failed";
    refresh();
    updateTag("cities");
    if (done !== "ok")
      return { ...venueMessage(done, "add", v.name, cityName), values: v };
  }
  return { ...venueMessage(r, "add", v.name, cityName), values: v };
}

/** Saves a venue's details and status, from the pencil on its row. */
export async function editVenue(
  _prev: VenueFormState,
  form: FormData,
): Promise<VenueFormState> {
  await requireSuperAdmin();
  const v = venueValues(form);
  const id = text(form.get("id"));
  const cityName = text(form.get("city_name")).slice(0, 80);
  const fail = (r: string) => ({
    ...venueMessage(r, "edit", v.name, cityName),
    values: v,
  });
  if (!UUID.test(id)) return fail("error");
  if (!VENUE_STATUSES.includes(v.status)) return fail("bad_status");
  const logo = logoChange(form);
  if (logo.kind === "bad") return fail("bad_logo");
  const r = await run("admin_update_venue", {
    p_id: id,
    p_name: v.name,
    p_address: v.address,
    p_website: v.website || null,
    p_map_url: v.map_url,
    p_instagram: v.instagram || null,
    p_facebook: v.facebook || null,
    p_area: v.area || null,
  });
  if (r !== "ok") return fail(r);
  if ((await applyVenueLogo(await createClient(), id, logo)) !== "ok")
    return fail("logo_failed");
  if (v.status !== text(form.get("old_status"))) {
    const st = await run("admin_set_content_status", {
      p_kind: "venue",
      p_id: id,
      p_status: v.status,
    });
    if (st !== "ok") return fail(st);
  }
  return { ...venueMessage("ok", "edit", v.name, cityName), values: v };
}

/** Edits a venue's details from Shows and tours > Venues. */
export async function updateVenue(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const ret = text(form.get("ret"));
  const base = ret.startsWith("/admin/shows?")
    ? ret
    : "/admin/shows?tab=venues";
  const go = (msg: string, keep: boolean) => {
    const u = new URL(base, "http://x");
    if (!keep) u.searchParams.delete("edit");
    u.searchParams.set("msg", msg);
    redirect(`${u.pathname}?${u.searchParams.toString()}`);
  };
  if (!UUID.test(id)) return go("error", false);
  const logo = logoChange(form);
  if (logo.kind === "bad") return go("venue_bad_logo", true);
  const r = await run("admin_update_venue", {
    p_id: id,
    p_name: text(form.get("name")).slice(0, 140),
    p_address: text(form.get("address")).slice(0, 220),
    p_website: text(form.get("website")).trim().slice(0, 500) || null,
    p_map_url: text(form.get("map_url")).trim().slice(0, 500),
    p_instagram: text(form.get("instagram")).trim().slice(0, 300) || null,
    p_facebook: text(form.get("facebook")).trim().slice(0, 300) || null,
    p_area: text(form.get("area")).trim().replace(/\s+/g, " ").slice(0, 60) || null,
  });
  if (r === "ok") {
    if ((await applyVenueLogo(await createClient(), id, logo)) !== "ok")
      return go("venue_logo_failed", true);
    return go("venue_saved", false);
  }
  go(
    r === "exists" ? "venue_exists" : r === "bad_value" ? "venue_bad" : "error",
    true,
  );
}
