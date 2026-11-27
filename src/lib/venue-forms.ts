/**
 * Add and edit venue forms in the admin Venues page.
 * Pure helpers (no server code) so the messages can be tested.
 */

/** Green and red plain text for results (no pills). */
export const okText = "text-sm font-bold text-[#157a3f]";
export const errText = "text-sm font-bold text-[#d12a1f]";

export const VENUE_FIELDS = [
  "name",
  "area",
  "address",
  "map_url",
  "website",
  "instagram",
  "facebook",
  "status",
] as const;
export type VenueField = (typeof VENUE_FIELDS)[number];

export type VenueFormState = {
  ok: boolean;
  /** Plain message: green when ok, red when not. Empty before the first save. */
  message: string;
  /** What was typed, so the form keeps it after an error. */
  values: Partial<Record<VenueField, string>>;
};

export const EMPTY_VENUE_STATE: VenueFormState = {
  ok: false,
  message: "",
  values: {},
};

export const VENUE_STATUSES = ["published", "pending", "draft", "archived"];

/** The typed values of a venue form, trimmed and cut to their limits. */
export function venueValues(form: FormData): Record<VenueField, string> {
  const get = (k: string, max: number) =>
    String(form.get(k) ?? "")
      .trim()
      .slice(0, max);
  return {
    name: get("name", 140),
    area: get("area", 60).replace(/\s+/g, " "),
    address: get("address", 220),
    map_url: get("map_url", 500),
    website: get("website", 500),
    instagram: get("instagram", 300),
    facebook: get("facebook", 300),
    status: get("status", 20),
  };
}

/** Turns a database answer into the message shown under the form. */
export function venueMessage(
  result: string,
  mode: "add" | "edit",
  name: string,
  city: string,
): { ok: boolean; message: string } {
  const venue = name.replace(/\s+/g, " ").trim() || "The venue";
  if (result === "ok")
    return {
      ok: true,
      message:
        mode === "add" ? `${venue} added and published.` : `${venue} saved.`,
    };
  if (result === "exists")
    return {
      ok: false,
      message: `${city || "This city"} already has a venue called ${venue}.`,
    };
  if (result === "bad_value")
    return {
      ok: false,
      message:
        "Check the venue: a name, a Google Maps link (google.com/maps or maps.app.goo.gl) and, if you add them, a website starting with https://, an Instagram handle or link and a Facebook page link.",
    };
  if (result === "bad_logo")
    return {
      ok: false,
      message: "The logo must be a JPG, PNG or WebP image. Please pick another file.",
    };
  if (result === "logo_failed")
    return {
      ok: false,
      message: `${venue} was saved, but the logo did not upload. Please try the logo again.`,
    };
  if (result === "bad_status")
    return { ok: false, message: "Pick a status from the list." };
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** Logo files the server accepts (the browser already cropped and shrank them). */
export const LOGO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
/** Below the 1 MB limit of a form post; a cropped 600 × 600 logo is about 50–150 KB. */
export const MAX_LOGO_BYTES = 900 * 1024;
/** Side of the square the browser crops logos to. */
export const LOGO_SIDE = 600;

/** What to do with a venue's logo when a form is saved. */
export type LogoChange = { kind: "keep" } | { kind: "remove" } | { kind: "upload"; file: File } | { kind: "bad" };

export function logoChange(form: FormData): LogoChange {
  const v = form.get("logo");
  const file = typeof v === "object" && v !== null && "size" in v && v.size > 0 ? (v as File) : null;
  if (file) return LOGO_TYPES[file.type] && file.size <= MAX_LOGO_BYTES ? { kind: "upload", file } : { kind: "bad" };
  return form.get("remove_logo") === "1" ? { kind: "remove" } : { kind: "keep" };
}

/** The centred square of a picture: where to cut it before shrinking it to LOGO_SIDE. */
export function squareCrop(width: number, height: number) {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}
