"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/data/admin";
import { findAnyPerformer } from "@/lib/data/admin-create";
import { getMyProfiles, requireAccount } from "@/lib/data/dashboard";
import { slugify } from "@/lib/profile-forms";
import { photoError, text, UUID } from "@/lib/profile-server";
import { insertShow, performerHome, placeShow, publishShow, savePerformers, uploadPoster, type Db, type Performer } from "@/lib/show-server";
import type { ShowErrors } from "@/lib/show-forms";
import { createClient } from "@/lib/supabase/server";
import { checkTour, type TourDateInput, type TourErrors, type TourSame } from "@/lib/tour-forms";

/** Add and edit tours, and put shows on a tour (spec 11.4 items 8, 9 and 10). */

const ADMIN_TOUR_STATUSES = ["published", "pending", "draft", "archived"] as const;

export type TourState = {
  message?: string;
  errors?: TourErrors & { poster?: string };
  dateErrors?: ShowErrors[];
  attempt?: number;
  input?: { name: string; description: string } & TourSame;
};

const DATE_FIELDS = { date: "d_date", time: "d_time", city_id: "d_city", venue_id: "d_venue", venue_name: "d_venue_name", ticket_url: "d_ticket", ticket_status: "d_status" } as const;

function readDates(form: FormData): TourDateInput[] {
  const cols = Object.fromEntries(Object.entries(DATE_FIELDS).map(([k, f]) => [k, form.getAll(f).map(String)])) as Record<keyof TourDateInput, string[]>;
  return cols.date.map((_, i) => Object.fromEntries(Object.keys(DATE_FIELDS).map((k) => [k, cols[k as keyof TourDateInput][i] ?? ""])) as TourDateInput);
}

const perfKey = (p: { kind: string; id: string }) => `${p.kind === "group" ? "g" : "c"}:${p.id}`;

/** Shows (of these ids) whose main performer is the tour owner; others are left alone. */
async function ownShows(db: Db, ids: string[], owner: Performer): Promise<string[]> {
  if (!ids.length) return [];
  const { data } = await db.from("show_performers").select("show_id, comedian_id, group_id").in("show_id", ids).eq("billing_order", 1);
  return ((data ?? []) as { show_id: string; comedian_id: string | null; group_id: string | null }[])
    .filter((r) => (owner.kind === "group" ? r.group_id === owner.id : r.comedian_id === owner.id))
    .map((r) => r.show_id);
}

export async function saveTour(_prev: TourState, form: FormData): Promise<TourState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  return storeTour(form, account.id, false);
}

/**
 * Admin > Shows and tours > Add new tour: any comedian or group, and the
 * status the super admin picks for the tour and its new dates.
 */
export async function adminSaveTour(_prev: TourState, form: FormData): Promise<TourState> {
  const account = await requireSuperAdmin();
  // With a tour_id the super admin edits any tour (Admin > Shows and tours > Tours > pencil).
  form.delete("import_ids");
  return storeTour(form, account.id, true);
}

async function storeTour(form: FormData, accountId: string, admin: boolean): Promise<TourState> {
  const tourId = text(form.get("tour_id"));
  if (tourId && !UUID.test(tourId)) return { message: "We couldn't find this tour." };
  const intent = text(form.get("intent")) === "draft" ? "draft" : "publish";

  const same: TourSame = {
    title_pattern: text(form.get("title_pattern")),
    language: text(form.get("language")),
    price_min: text(form.get("price_min")),
    price_max: text(form.get("price_max")),
    currency: text(form.get("currency")) || "EGP",
    age_rating: text(form.get("age_rating")),
    doors: text(form.get("doors")),
  };
  const tourInput = { performer: text(form.get("performer")), name: text(form.get("name")), description: text(form.get("description")) };
  const input = { name: tourInput.name, description: tourInput.description, ...same };
  const fail = (s: Omit<TourState, "attempt" | "input">): TourState => ({ message: "Please check the highlighted fields.", ...s, attempt: Date.now(), input });

  const supabase = await createClient();
  const dates = readDates(form);
  const importIds = [...new Set(form.getAll("import_ids").map(String))].filter((v) => UUID.test(v)).slice(0, 100);

  // City names for the title pattern (only used if it has [City]).
  const cityIds = [...new Set(dates.map((d) => d.city_id).filter((v) => UUID.test(v)))];
  const { data: cityRows } = cityIds.length ? await supabase.from("cities").select("id, name").in("id", cityIds) : { data: [] };
  const names = new Map(((cityRows ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));

  const checked = checkTour(tourInput, dates, same, { now: new Date(), cityName: (id) => names.get(id) ?? null, needDates: !tourId && importIds.length === 0 });
  const { file, error: posterErr } = photoError(form, "poster");
  if (!checked.values || !checked.performer || posterErr) {
    return fail({ errors: { ...checked.errors, ...(posterErr ? { poster: posterErr } : {}) }, dateErrors: checked.dateErrors });
  }

  // The owner must be one of the profiles this account manages (spec 11.4 item 8); the super admin may pick any.
  const owner = admin
    ? await findAnyPerformer(checked.performer.kind, checked.performer.id)
    : (await getMyProfiles()).find((p) => p.kind === checked.performer!.kind && p.id === checked.performer!.id);
  if (!owner) return fail({ errors: { performer: admin ? "Please choose a comedian or group." : "Please choose one of your profiles." } });
  const performer: Performer = { kind: owner.kind, id: owner.id };

  // 1. The tour itself.
  let id = tourId;
  let slug = "";
  const details = { name: tourInput.name.trim().replace(/\s+/g, " "), description: tourInput.description.trim() || null };
  if (tourId) {
    const { data: current } = await supabase.from("tours").select("comedian_id, group_id").eq("id", tourId).maybeSingle();
    const cur = current as { comedian_id: string | null; group_id: string | null } | null;
    // The owner of a tour stays the same; its dates are its shows.
    if (!cur || perfKey({ kind: cur.group_id ? "group" : "comedian", id: (cur.group_id ?? cur.comedian_id)! }) !== perfKey(performer)) {
      return { message: "We couldn't find this tour." };
    }
    const { data, error } = await supabase.from("tours").update(details).eq("id", tourId).select("slug").single();
    if (error || !data) {
      console.error("update tour", error?.message);
      return fail({ message: "We couldn't save the tour. Please try again." });
    }
    slug = (data as { slug: string }).slug;
  } else {
    const base = slugify(details.name, "tour");
    for (let attempt = 0; attempt < 3 && !id; attempt++) {
      const trySlug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("tours")
        .insert({ ...details, slug: trySlug, status: "draft", created_by: accountId, ...(performer.kind === "group" ? { group_id: performer.id } : { comedian_id: performer.id }) })
        .select("id")
        .single();
      if (data) {
        id = (data as { id: string }).id;
        slug = trySlug;
      } else if (error?.code !== "23505") {
        console.error("insert tour", error?.message);
        return fail({ message: "We couldn't save the tour. Please try again." });
      }
    }
    if (!id) return fail({ message: "We couldn't save the tour. Please try again." });
  }

  if (file) {
    const url = await uploadPoster(supabase, performer, `tour-${id}`, file);
    if (url) await supabase.from("tours").update({ poster_url: url }).eq("id", id);
  }

  // 2. Each new date is its own show on the tour (spec 11.4 item 8).
  const home = await performerHome(supabase, performer);
  const guests = form.getAll("member_ids").map(String);
  const failed: string[] = [];
  const made: { id: string; soldOut: boolean }[] = [];
  for (const v of checked.values) {
    const place = await placeShow(supabase, v.city_id, home);
    if (!place) {
      failed.push(v.title);
      continue;
    }
    // Only Comedy Radar adds venues (Dina, 2026-11-26): a typed new venue is left empty.
    const venueId = v.new_venue ? null : v.venue_id;
    const show = await insertShow(supabase, accountId, {
      title: v.title,
      description: details.description,
      starts_at: v.starts_at,
      doors_at: v.doors_at,
      city_id: place.cityId,
      venue_id: venueId,
      zone: place.zone,
      market_country_id: place.market,
      ticket_url: v.ticket_url,
      price_min: v.price_min,
      price_max: v.price_max,
      currency: v.currency,
      language: v.language,
      age_rating: v.age_rating,
      good_to_know: [],
      tour_id: id,
    });
    if (!show) {
      failed.push(v.title);
      continue;
    }
    await savePerformers(supabase, accountId, show.id, performer, guests, new Set());
    made.push({ id: show.id, soldOut: v.sold_out });
  }

  // 3. "Import my existing shows": only shows of the same performer.
  const imported = await ownShows(supabase, importIds, performer);
  if (imported.length) {
    const { error } = await supabase.from("shows").update({ tour_id: id }).in("id", imported).is("tour_id", null);
    if (error) console.error("import shows", error.message);
  }

  if (admin) {
    const picked = ADMIN_TOUR_STATUSES.find((x) => x === text(form.get("status")));
    // Archived is only for tours that exist.
    const status = picked && (tourId || picked !== "archived") ? picked : "published";
    if (tourId || status !== "draft") {
      const { error } = await supabase.from("tours").update({ status }).eq("id", id);
      if (error) console.error("admin tour status", error.message);
    }
    // New dates follow the tour (an archived tour's new dates stay drafts).
    if (status === "published" || status === "pending") {
      for (const m of made) await supabase.from("shows").update({ status: status === "published" && m.soldOut ? "sold_out" : status }).eq("id", m.id);
    }
    updateTag("shows");
    updateTag("tours");
    redirect(`/admin/shows?tab=tours&msg=${failed.length ? (tourId ? "tour_dates_failed" : "tour_some_failed") : tourId ? "saved" : "created"}`);
  }

  // 4. Publish: the tour and its draft dates go live (or to review for unverified profiles).
  let status = "draft";
  if (intent === "publish") {
    const { data: after } = await supabase.from("tours").update({ status: "published" }).eq("id", id).select("status").single();
    status = (after as { status: string } | null)?.status ?? "pending";
    const { data: drafts } = await supabase.from("shows").select("id").eq("tour_id", id).eq("status", "draft");
    for (const d of (drafts ?? []) as { id: string }[]) {
      const s = await publishShow(supabase, d.id);
      if (s === "published" && made.find((m) => m.id === d.id)?.soldOut) await supabase.from("shows").update({ status: "sold_out" }).eq("id", d.id);
    }
  } else if (tourId) {
    const { data } = await supabase.from("tours").select("status").eq("id", id).single();
    status = (data as { status: string } | null)?.status ?? "draft";
  }

  updateTag("shows");
  updateTag("tours");
  const q = new URLSearchParams({ saved: slug, as: status });
  if (made.length) q.set("dates", String(made.length));
  if (failed.length) q.set("failed", String(failed.length));
  if (imported.length) q.set("imported", String(imported.length));
  redirect(`/dashboard/tours?${q}`);
}

/** Bulk "Add to a tour" (or take off a tour) from the Shows list (spec 11.4 item 9). */
export async function setShowsTour(form: FormData): Promise<void> {
  const account = await requireAccount();
  if (account.is_suspended) return;
  const ids = [...new Set(form.getAll("show_ids").map(String))].filter((v) => UUID.test(v)).slice(0, 200);
  const tourId = text(form.get("tour_id"));
  if (!ids.length || (tourId && tourId !== "none" && !UUID.test(tourId))) return;
  const supabase = await createClient();
  if (tourId === "none") {
    // Row-level security limits this to shows the account manages.
    const { error } = await supabase.from("shows").update({ tour_id: null }).in("id", ids);
    if (error) console.error("setShowsTour", error.message);
  } else {
    const { data } = await supabase.from("tours").select("comedian_id, group_id").eq("id", tourId).maybeSingle();
    const t = data as { comedian_id: string | null; group_id: string | null } | null;
    if (!t) return;
    const owner: Performer = t.group_id ? { kind: "group", id: t.group_id } : { kind: "comedian", id: t.comedian_id! };
    const profiles = await getMyProfiles();
    if (!profiles.some((p) => perfKey(p) === perfKey(owner))) return;
    // A tour belongs to one comedian or one group: only their shows join it.
    const own = await ownShows(supabase, ids, owner);
    if (own.length) {
      const { error } = await supabase.from("shows").update({ tour_id: tourId }).in("id", own);
      if (error) console.error("setShowsTour", error.message);
    }
  }
  updateTag("shows");
  updateTag("tours");
  refresh();
}
