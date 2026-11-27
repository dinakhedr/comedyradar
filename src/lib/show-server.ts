import "server-only";
import { slugify } from "@/lib/profile-forms";
import { showZone } from "@/lib/show-forms";
import { createClient } from "@/lib/supabase/server";
import { UUID } from "./profile-server";

/** Server helpers shared by the show and tour actions: placing, saving and publishing a show. Not actions themselves. */

export type Db = Awaited<ReturnType<typeof createClient>>;
export type Performer = { kind: "comedian" | "group"; id: string };

const POSTER_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Reads the home market of a performer once, for several shows. */
export async function performerHome(db: Db, performer: Performer): Promise<{ inMarket: boolean | null; countryId: string | null }> {
  const { data } = await db
    .from(performer.kind === "group" ? "comedy_groups" : "comedians")
    .select("home_country_id, countries(is_market)")
    .eq("id", performer.id)
    .maybeSingle();
  const home = data as unknown as { home_country_id: string | null; countries: { is_market: boolean } | null } | null;
  return { inMarket: home?.home_country_id ? !!home.countries?.is_market : null, countryId: home?.home_country_id ?? null };
}

/**
 * The city of a show, its coverage zone and the market it belongs to: the
 * city's country when it is a market, else the performer's home market, else
 * the first market. Null when the city does not exist.
 */
export async function placeShow(
  db: Db,
  cityId: string,
  home: { inMarket: boolean | null; countryId: string | null },
): Promise<{ cityId: string; zone: "local" | "inbound" | "outbound"; market: string } | null> {
  const { data } = await db.from("cities").select("id, country_id, countries(is_market)").eq("id", cityId).maybeSingle();
  const city = data as unknown as { id: string; country_id: string; countries: { is_market: boolean } | null } | null;
  if (!city) return null;
  const cityInMarket = !!city.countries?.is_market;
  let market = cityInMarket ? city.country_id : home.inMarket ? home.countryId : null;
  if (!market) {
    const { data: m } = await db.from("countries").select("id").eq("is_market", true).order("code").limit(1).maybeSingle();
    market = (m as { id: string } | null)?.id ?? city.country_id;
  }
  return { cityId: city.id, zone: showZone(cityInMarket, home.inMarket), market };
}

/** Inserts a show as a draft with a free slug ("title-2026-12-04"). */
export async function insertShow(db: Db, accountId: string, row: Record<string, unknown> & { title: string; starts_at: string }): Promise<{ id: string; slug: string } | null> {
  const base = `${slugify(row.title, "show")}-${row.starts_at.slice(0, 10)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await db
      .from("shows")
      .insert({ ...row, slug, status: "draft", created_by: accountId })
      .select("id")
      .single();
    if (data) return { id: (data as { id: string }).id, slug };
    if (error?.code !== "23505") {
      console.error("insert show", error?.message);
      return null;
    }
  }
  return null;
}

/**
 * Main performer (billing 1) and lineup tags. Lineup tags not in `keep` are
 * removed; tagged comedians who are managed by others get a request.
 */
export async function savePerformers(db: Db, accountId: string, showId: string, main: Performer, lineupIds: string[], keep: Set<string>) {
  const lineup = [...new Set(lineupIds)].filter((v) => UUID.test(v) && !(main.kind === "comedian" && v === main.id)).slice(0, 15);
  const { data: existing } = await db.from("show_performers").select("id, comedian_id, group_id, billing_order").eq("show_id", showId);
  const rows = (existing ?? []) as { id: string; comedian_id: string | null; group_id: string | null; billing_order: number }[];

  const isMain = (r: (typeof rows)[number]) => (main.kind === "group" ? r.group_id === main.id : r.comedian_id === main.id);
  // Remove the old main performer when it changed, and lineup tags that were taken off.
  const remove = rows.filter((r) => (r.billing_order === 1 && !isMain(r)) || (r.billing_order > 1 && r.comedian_id && !keep.has(r.comedian_id) && !isMain(r)));
  if (remove.length) await db.from("show_performers").delete().in("id", remove.map((r) => r.id));

  const mainRow = rows.find(isMain);
  if (!mainRow) {
    const { error } = await db.from("show_performers").insert({ show_id: showId, billing_order: 1, ...(main.kind === "group" ? { group_id: main.id } : { comedian_id: main.id }) });
    if (error) console.error("main performer", error.message);
  } else if (mainRow.billing_order !== 1) {
    await db.from("show_performers").update({ billing_order: 1 }).eq("id", mainRow.id);
  }

  const already = new Set(rows.filter((r) => !remove.includes(r)).map((r) => r.comedian_id));
  const add = lineup.filter((id) => !already.has(id));
  if (!add.length) return;
  const start = Math.max(1, ...rows.filter((r) => !remove.includes(r)).map((r) => r.billing_order)) + 1;
  const { data: inserted, error } = await db
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
    const { error: reqErr } = await db
      .from("link_requests")
      .insert(pending.map((r) => ({ type: "lineup_tag", from_account_id: accountId, target_comedian_id: r.comedian_id, show_id: showId })));
    if (reqErr) console.error("lineup requests", reqErr.message);
  }
}

/** Uploads a poster for a show or tour and returns its public address. */
export async function uploadPoster(db: Db, performer: Performer, name: string, file: File): Promise<string | null> {
  const path = `${performer.kind}/${performer.id}/${name}-${Date.now()}.${POSTER_TYPES[file.type]}`;
  const { error } = await db.storage.from("posters").upload(path, file, { contentType: file.type });
  if (error) {
    console.error("poster", error.message);
    return null;
  }
  return db.storage.from("posters").getPublicUrl(path).data.publicUrl;
}

/**
 * Saves a show's or tour's two posters (Dina, 2026-11-27): uploads the new
 * wide (`poster`) and tall (`poster_tall`) files, and clears the ones taken
 * off with Remove. A poster that is not touched stays as it is.
 */
export async function savePosters(
  db: Db,
  form: FormData,
  table: "shows" | "tours",
  id: string,
  performer: Performer,
  name: string,
  wide: File | null,
  tall: File | null,
  /** A duplicated show: its posters carry over unless removed or replaced. */
  copied?: { poster_url: string | null; poster_tall_url: string | null } | null,
): Promise<void> {
  const patch: { poster_url?: string | null; poster_tall_url?: string | null } = {};
  if (copied?.poster_url && form.get("poster_remove") !== "1") patch.poster_url = copied.poster_url;
  if (copied?.poster_tall_url && form.get("poster_tall_remove") !== "1") patch.poster_tall_url = copied.poster_tall_url;
  if (form.get("poster_remove") === "1") patch.poster_url = null;
  if (form.get("poster_tall_remove") === "1") patch.poster_tall_url = null;
  if (wide) {
    const url = await uploadPoster(db, performer, name, wide);
    if (url) patch.poster_url = url;
  }
  if (tall) {
    const url = await uploadPoster(db, performer, `${name}-tall`, tall);
    if (url) patch.poster_tall_url = url;
  }
  if (!Object.keys(patch).length) return;
  const { error } = await db.from(table).update(patch).eq("id", id);
  if (error) console.error("posters", error.message);
}

/**
 * Publishes a draft or pending show: live at once for verified profiles; the
 * database sends the others to review. Returns the status it ends with.
 */
export async function publishShow(db: Db, id: string): Promise<string> {
  const { data } = await db.from("shows").select("status").eq("id", id).single();
  const current = (data as { status: string } | null)?.status;
  if (current !== "draft" && current !== "pending") return current ?? "draft";
  const { data: after } = await db.from("shows").update({ status: "published" }).eq("id", id).select("status").single();
  return (after as { status: string } | null)?.status ?? "pending";
}
