import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { LOGO_TYPES, type LogoChange } from "@/lib/venue-forms";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * Applies a logo change to a venue (super admin only; the database checks it again).
 * Files live at venues/<venue_id>/logo-<time>.<ext>; older files of the venue are removed.
 * Returns "ok", or "logo_failed" when the upload or the save did not work.
 */
export async function applyVenueLogo(db: Db, venueId: string, change: LogoChange): Promise<"ok" | "logo_failed"> {
  if (change.kind === "keep" || change.kind === "bad") return "ok";
  let url: string | null = null;
  let keep = "";
  if (change.kind === "upload") {
    keep = `logo-${Date.now()}.${LOGO_TYPES[change.file.type]}`;
    const { error } = await db.storage.from("venues").upload(`${venueId}/${keep}`, change.file, { contentType: change.file.type, upsert: false });
    if (error) {
      console.error("venue logo upload", error.message);
      return "logo_failed";
    }
    url = db.storage.from("venues").getPublicUrl(`${venueId}/${keep}`).data.publicUrl;
  }
  const { data, error } = await db.rpc("admin_set_venue_logo", { p_id: venueId, p_logo_url: url });
  if (error || data !== "ok") {
    console.error("venue logo save", error?.message ?? data);
    return "logo_failed";
  }
  // Tidy up the venue's older logo files (best effort).
  const { data: files } = await db.storage.from("venues").list(venueId, { limit: 100 });
  const old = (files ?? []).map((f) => f.name).filter((n) => n !== keep);
  if (old.length) {
    const { error: rmErr } = await db.storage.from("venues").remove(old.map((n) => `${venueId}/${n}`));
    if (rmErr) console.error("venue logo cleanup", rmErr.message);
  }
  return "ok";
}
