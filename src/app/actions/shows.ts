"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getMyProfiles, requireAccount } from "@/lib/data/dashboard";
import { photoError, text, UUID } from "@/lib/profile-server";
import { slugify } from "@/lib/profile-forms";
import { checkShow, type ShowErrors, type ShowInput } from "@/lib/show-forms";
import { createClient } from "@/lib/supabase/server";

/** Add, edit and update shows from the creator dashboard (spec 11.4 items 4 and 9). */

export type ShowState = { message?: string; errors?: ShowErrors & { poster?: string }; attempt?: number };

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

const POSTER_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveShow(_prev: ShowState, form: FormData): Promise<ShowState> {
  const account = await requireAccount();
  if (account.is_suspended) return { message: "This account is suspended." };
  const showId = text(form.get("show_id"));
  if (showId && !UUID.test(showId)) return { message: "We couldn't find this show." };
  const intent = text(form.get("intent")) === "draft" ? "draft" : "publish";

  const input = Object.fromEntries(FIELDS.map((k) => [k, text(form.get(k))])) as ShowInput;
  const { values, errors } = checkShow(input, { now: new Date(), allowPast: !!showId });
  const { file, error: posterErr } = photoError(form, "poster");
  if (!values || posterErr) {
    return { errors: { ...errors, ...(posterErr ? { poster: posterErr } : {}) }, message: "Please check the highlighted fields.", attempt: Date.now() };
  }

  // The performer must be one of the profiles this account manages (spec 11.4 item 4).
  const profiles = await getMyProfiles();
  const performer = profiles.find((p) => p.kind === values.performer.kind && p.id === values.performer.id);
  if (!performer) return { errors: { performer: "Please choose one of your profiles." }, message: "Please check the highlighted fields." };

  const supabase = await createClient();
  const performerTable = performer.kind === "group" ? "comedy_groups" : "comedians";
  const [cityRes, homeRes] = await Promise.all([
    supabase.from("cities").select("id, country_id, countries(is_market)").eq("id", values.city_id).maybeSingle(),
    supabase.from(performerTable).select("home_country_id, countries(is_market)").eq("id", performer.id).maybeSingle(),
  ]);
  const city = cityRes.data as unknown as { id: string; country_id: string; countries: { is_market: boolean } | null } | null;
  if (!city) return { errors: { city_id: "Please choose the city." }, message: "Please check the highlighted fields." };
  const home = homeRes.data as unknown as { home_country_id: string | null; countries: { is_market: boolean } | null } | null;
  const cityInMarket = !!city.countries?.is_market;
  const homeInMarket = home?.home_country_id ? !!home.countries?.is_market : null;
  const zone = !cityInMarket ? "outbound" : homeInMarket === false ? "inbound" : "local";
  // The market the show belongs to: the city's country when it is a market, else the performer's home market.
  let marketCountry = cityInMarket ? city.country_id : homeInMarket ? home!.home_country_id : null;
  if (!marketCountry) {
    const { data: m } = await supabase.from("countries").select("id").eq("is_market", true).order("code").limit(1).maybeSingle();
    marketCountry = (m as { id: string } | null)?.id ?? city.country_id;
  }

  // A new venue is suggested and waits for Comedy Radar (spec 11.4 item 4).
  let venueId = values.venue_id;
  if (values.new_venue) {
    const base = slugify(values.new_venue.name, "venue");
    const { data: v, error } = await supabase
      .from("venues")
      .insert({
        name: values.new_venue.name,
        address: values.new_venue.address,
        city_id: city.id,
        slug: `${base}-${Math.random().toString(36).slice(2, 7)}`,
        status: "pending",
        created_by: account.id,
      })
      .select("id")
      .single();
    if (error || !v) {
      console.error("suggest venue", error?.message);
      return { errors: { venue: "We couldn't save the new venue. Please try again." }, message: "Please check the highlighted fields." };
    }
    venueId = (v as { id: string }).id;
  }

  const row = {
    title: values.title,
    description: values.description,
    starts_at: values.starts_at,
    doors_at: values.doors_at,
    city_id: city.id,
    venue_id: venueId,
    zone,
    market_country_id: marketCountry,
    ticket_url: values.ticket_url,
    price_min: values.price_min,
    price_max: values.price_max,
    currency: values.currency,
    language: values.language,
    age_rating: values.age_rating,
    good_to_know: values.good_to_know,
    signal_request: values.signal_request,
    tour_id: values.tour_id,
  };

  let id = showId;
  let slug = "";
  if (showId) {
    const { data, error } = await supabase.from("shows").update(row).eq("id", showId).select("slug, status").single();
    if (error || !data) {
      console.error("update show", error?.message);
      return { message: "We couldn't save the show. Please try again." };
    }
    slug = (data as { slug: string }).slug;
  } else {
    const day = values.starts_at.slice(0, 10);
    const base = `${slugify(values.title, "show")}-${day}`;
    for (let attempt = 0; attempt < 3 && !id; attempt++) {
      const trySlug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("shows")
        .insert({ ...row, slug: trySlug, status: "draft", created_by: account.id })
        .select("id")
        .single();
      if (data) {
        id = (data as { id: string }).id;
        slug = trySlug;
      } else if (error?.code !== "23505") {
        console.error("insert show", error?.message);
        return { message: "We couldn't save the show. Please try again." };
      }
    }
    if (!id) return { message: "We couldn't save the show. Please try again." };
  }

  await savePerformers(supabase, account.id, id, performer, form);

  if (file) {
    const path = `${performer.kind}/${performer.id}/show-${id}-${Date.now()}.${POSTER_TYPES[file.type]}`;
    const { error } = await supabase.storage.from("posters").upload(path, file, { contentType: file.type });
    if (error) console.error("poster", error.message);
    else await supabase.from("shows").update({ poster_url: supabase.storage.from("posters").getPublicUrl(path).data.publicUrl }).eq("id", id);
  }

  // Publish: live at once for verified profiles; the database sends the others to review.
  let status = "draft";
  if (intent === "publish") {
    const { data } = await supabase.from("shows").select("status").eq("id", id).single();
    const current = (data as { status: string } | null)?.status;
    if (current === "draft" || current === "pending") {
      const { data: after } = await supabase.from("shows").update({ status: "published" }).eq("id", id).select("status").single();
      status = (after as { status: string } | null)?.status ?? "pending";
    } else status = current ?? "draft";
  } else if (showId) {
    const { data } = await supabase.from("shows").select("status").eq("id", id).single();
    status = (data as { status: string } | null)?.status ?? "draft";
  }

  updateTag("shows");
  redirect(`/dashboard/shows?saved=${encodeURIComponent(slug)}&as=${status}`);
}

/** Main performer (billing 1) and lineup tags; tagged comedians who are managed by others get a request. */
async function savePerformers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  showId: string,
  main: { kind: "comedian" | "group"; id: string },
  form: FormData,
) {
  const lineup = [...new Set(form.getAll("member_ids").map(String))].filter((v) => UUID.test(v) && !(main.kind === "comedian" && v === main.id)).slice(0, 15);
  const keep = new Set(form.getAll("keep_lineup").map(String));
  const { data: existing } = await supabase.from("show_performers").select("id, comedian_id, group_id, billing_order").eq("show_id", showId);
  const rows = (existing ?? []) as { id: string; comedian_id: string | null; group_id: string | null; billing_order: number }[];

  const isMain = (r: (typeof rows)[number]) => (main.kind === "group" ? r.group_id === main.id : r.comedian_id === main.id);
  // Remove the old main performer when it changed, and lineup tags that were taken off.
  const remove = rows.filter((r) => (r.billing_order === 1 && !isMain(r)) || (r.billing_order > 1 && r.comedian_id && !keep.has(r.comedian_id) && !isMain(r)));
  if (remove.length) await supabase.from("show_performers").delete().in("id", remove.map((r) => r.id));

  const mainRow = rows.find(isMain);
  if (!mainRow) {
    const { error } = await supabase
      .from("show_performers")
      .insert({ show_id: showId, billing_order: 1, ...(main.kind === "group" ? { group_id: main.id } : { comedian_id: main.id }) });
    if (error) console.error("main performer", error.message);
  } else if (mainRow.billing_order !== 1) {
    await supabase.from("show_performers").update({ billing_order: 1 }).eq("id", mainRow.id);
  }

  const already = new Set(rows.filter((r) => !remove.includes(r)).map((r) => r.comedian_id));
  const add = lineup.filter((id) => !already.has(id));
  if (!add.length) return;
  const start = Math.max(1, ...rows.filter((r) => !remove.includes(r)).map((r) => r.billing_order)) + 1;
  const { data: inserted, error } = await supabase
    .from("show_performers")
    .insert(add.map((comedian_id, i) => ({ show_id: showId, comedian_id, billing_order: start + i })))
    .select("comedian_id, link_status");
  if (error) {
    console.error("lineup", error.message);
    return;
  }
  // Tagged comedians managed by someone else confirm first (spec 11.3, consent).
  const pending = ((inserted ?? []) as { comedian_id: string; link_status: string }[]).filter((r) => r.link_status === "pending");
  if (pending.length) {
    const { error: reqErr } = await supabase
      .from("link_requests")
      .insert(pending.map((r) => ({ type: "lineup_tag", from_account_id: accountId, target_comedian_id: r.comedian_id, show_id: showId })));
    if (reqErr) console.error("lineup requests", reqErr.message);
  }
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
}
