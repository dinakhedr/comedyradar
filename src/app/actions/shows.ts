"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/data/admin";
import { findAnyPerformer } from "@/lib/data/admin-create";
import { getMyProfiles, requireAccount } from "@/lib/data/dashboard";
import { photoError, text, UUID } from "@/lib/profile-server";
import { checkShow, type ShowErrors, type ShowInput } from "@/lib/show-forms";
import { insertShow, performerHome, placeShow, publishShow, savePerformers, savePosters } from "@/lib/show-server";
import { createClient } from "@/lib/supabase/server";

/** Add, edit and update shows from the creator dashboard (spec 11.4 items 4 and 9). */

const ADMIN_SHOW_STATUSES = ["published", "pending", "draft", "sold_out", "cancelled"] as const;

export type ShowState = { message?: string; errors?: ShowErrors & { poster?: string; poster_tall?: string }; attempt?: number; input?: Partial<ShowInput> };

const FIELDS: (keyof ShowInput)[] = [
  "performer",
  "title",
  "description",
  "date",
  "time",
  "doors",
  "city_id",
  "venue_id",
  "venue_name",
  "venue_address",
  "ticket_url",
  "price_min",
  "price_max",
  "currency",
  "language",
  "age_rating",
  "good_to_know",
  "signal_request",
  "tour_id",
];

export async function saveShow(_prev: ShowState, form: FormData): Promise<ShowState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  return storeShow(form, account.id, false);
}

/**
 * Admin > Shows and tours > Add new show: any comedian or group, any venue on
 * the list, and the status the super admin picks (Published goes live at once).
 */
export async function adminSaveShow(_prev: ShowState, form: FormData): Promise<ShowState> {
  const account = await requireSuperAdmin();
  // With a show_id the super admin edits any show (Admin > Shows and tours > pencil).
  return storeShow(form, account.id, true);
}

async function storeShow(form: FormData, accountId: string, admin: boolean): Promise<ShowState> {
  const showId = text(form.get("show_id"));
  if (showId && !UUID.test(showId)) return { message: "We couldn't find this show." };
  const intent = text(form.get("intent")) === "draft" ? "draft" : "publish";

  const input = Object.fromEntries(FIELDS.map((k) => [k, text(form.get(k))])) as ShowInput;
  const { values, errors } = checkShow(input, { now: new Date(), allowPast: !!showId });
  // Two posters: wide (everywhere) and tall (the show page). Both optional.
  const { file, error: posterErr } = photoError(form, "poster");
  const { file: tallFile, error: tallErr } = photoError(form, "poster_tall");
  if (!values || posterErr || tallErr) {
    return {
      errors: { ...errors, ...(posterErr ? { poster: posterErr } : {}), ...(tallErr ? { poster_tall: tallErr } : {}) },
      message: "Please check the highlighted fields.",
      attempt: Date.now(),
      input,
    };
  }

  // The performer must be one of the profiles this account manages (spec 11.4 item 4); the super admin may pick any.
  const performer = admin
    ? await findAnyPerformer(values.performer.kind, values.performer.id)
    : (await getMyProfiles()).find((p) => p.kind === values.performer.kind && p.id === values.performer.id);
  if (!performer) {
    return { errors: { performer: admin ? "Please choose a comedian or group." : "Please choose one of your profiles." }, message: "Please check the highlighted fields.", attempt: Date.now(), input };
  }

  const supabase = await createClient();
  const place = await placeShow(supabase, values.city_id, await performerHome(supabase, performer));
  if (!place) return { errors: { city_id: "Please choose the city." }, message: "Please check the highlighted fields.", attempt: Date.now(), input };

  // Only Comedy Radar adds venues (Dina, 2026-11-26): creators pick one from the list.
  if (values.new_venue) return { errors: { venue: "Please choose a venue from the list." }, message: "Please check the highlighted fields.", attempt: Date.now(), input };
  const venueId = values.venue_id;

  const row = {
    title: values.title,
    description: values.description,
    starts_at: values.starts_at,
    doors_at: values.doors_at,
    city_id: place.cityId,
    venue_id: venueId,
    zone: place.zone,
    market_country_id: place.market,
    ticket_url: values.ticket_url,
    price_min: values.price_min,
    price_max: values.price_max,
    currency: values.currency,
    language: values.language,
    age_rating: values.age_rating,
    good_to_know: values.good_to_know,
    tour_id: values.tour_id,
    // The admin form has no signal request: a creator's open request stays as it is.
    ...(admin ? {} : { signal_request: values.signal_request }),
  };

  let id = showId;
  let slug = "";
  if (showId) {
    const { data, error } = await supabase.from("shows").update(row).eq("id", showId).select("slug, status").single();
    if (error || !data) {
      console.error("update show", error?.message);
      return { message: "We couldn't save the show. Please try again.", attempt: Date.now(), input };
    }
    slug = (data as { slug: string }).slug;
  } else {
    const made = await insertShow(supabase, accountId, row);
    if (!made) return { message: "We couldn't save the show. Please try again.", attempt: Date.now(), input };
    ({ id, slug } = made);
  }

  await savePerformers(supabase, accountId, id, performer, form.getAll("member_ids").map(String), new Set(form.getAll("keep_lineup").map(String)));

  // Duplicate: the copy keeps the posters of the show it came from (read with the same access rules).
  const copyFrom = showId ? "" : text(form.get("copy_from"));
  let copied: { poster_url: string | null; poster_tall_url: string | null } | null = null;
  if (copyFrom && UUID.test(copyFrom)) {
    const { data } = await supabase.from("shows").select("poster_url, poster_tall_url").eq("id", copyFrom).maybeSingle();
    copied = (data as typeof copied) ?? null;
  }
  await savePosters(supabase, form, "shows", id, performer, `show-${id}`, file, tallFile, copied);

  if (admin) {
    const picked = ADMIN_SHOW_STATUSES.find((x) => x === text(form.get("status")));
    // A new show is saved as a draft first; Sold out and Cancelled are only for shows that exist.
    const status = picked && (showId || ["published", "pending", "draft"].includes(picked)) ? picked : "published";
    if (showId || status !== "draft") {
      const { error } = await supabase.from("shows").update({ status }).eq("id", id);
      if (error) console.error("admin show status", error.message);
    }
    updateTag("shows");
    redirect(`/admin/shows?msg=${showId ? "saved" : "created"}`);
  }

  // Publish: live at once for verified profiles; the database sends the others to review.
  let status = "draft";
  if (intent === "publish") status = await publishShow(supabase, id);
  else if (showId) {
    const { data } = await supabase.from("shows").select("status").eq("id", id).single();
    status = (data as { status: string } | null)?.status ?? "draft";
  }

  updateTag("shows");
  redirect(`/dashboard/shows?saved=${encodeURIComponent(slug)}&as=${status}`);
}

/** Row and bulk actions: mark sold out, back on sale, cancel (spec 11.4 item 9). */
export async function updateShowStatus(form: FormData): Promise<void> {
  const account = await requireAccount();
  if (account.is_suspended) return;
  const action = text(form.get("action"));
  const ids = [...new Set(form.getAll("show_ids").map(String))].filter((v) => UUID.test(v)).slice(0, 200);
  if (!ids.length) return;
  const supabase = await createClient();
  const from: Record<string, string[]> = { sold_out: ["published"], on_sale: ["sold_out"], cancel: ["draft", "pending", "published", "sold_out"] };
  const to: Record<string, string> = { sold_out: "sold_out", on_sale: "published", cancel: "cancelled" };
  if (!to[action]) return;
  // Cancelling several shows at once needs the confirm tick in the bulk bar.
  if (action === "cancel" && ids.length > 1 && form.get("confirm_cancel") !== "yes") return;
  // Row-level security limits this to shows the account manages.
  const { error } = await supabase.from("shows").update({ status: to[action] }).in("id", ids).in("status", from[action]);
  if (error) console.error("updateShowStatus", error.message);
  updateTag("shows");
  refresh();
}
