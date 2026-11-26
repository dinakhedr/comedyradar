/**
 * Add and edit venue forms in admin Settings > Locations and venues.
 * Pure helpers (no server code) so the messages can be tested.
 */

/** Green and red plain text for results (no pills). */
export const okText = "text-sm font-bold text-[#1f9d55]";
export const errText = "text-sm font-bold text-[#d12a1f]";

export const VENUE_FIELDS = [
  "name",
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
  if (result === "bad_status")
    return { ok: false, message: "Pick a status from the list." };
  return { ok: false, message: "Something went wrong. Please try again." };
}
