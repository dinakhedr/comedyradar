/** Default cover for profiles without their own (Dina approved, 2026-11-26). */
export const DEFAULT_COVER = "/brand/covers/default-cover.svg";

/** The profile's cover, or the default one. */
export const coverOf = (url: string | null | undefined) => url || DEFAULT_COVER;
