/**
 * Two posters per show and tour (Dina, 2026-11-27):
 *   wide (poster_url, 16:9)       used everywhere: Spotlight, cards, lists, search, tour banners.
 *   tall (poster_tall_url, 4:5)   used only on the single show page and single tour page.
 * If only one is there, it is used for both. A tour date with any poster of its
 * own uses its own; otherwise it uses the tour's. (The database views do the same.)
 */

export type PosterPair = { poster_url: string | null; poster_tall_url: string | null };
export type Posters = { wide: string | null; tall: string | null };

export const WIDE_GUIDE = "Landscape 16:9, best size 1920 × 1080.";
export const TALL_GUIDE = "Portrait 4:5, best size 1080 × 1350.";

/** Posters are shrunk in the browser to at most this many pixels on the long side before upload. */
export const POSTER_MAX_SIDE = 2000;
/** Files at or under this size that are already small enough are sent as they are. */
export const POSTER_KEEP_BYTES = 900_000;

/**
 * The size to shrink a poster to so two posters fit in one form save:
 * null = send the file as it is; otherwise the new width and height.
 */
export function shrinkTo(width: number, height: number, bytes: number, max = POSTER_MAX_SIDE): { width: number; height: number } | null {
  const long = Math.max(width, height);
  if (long <= max && bytes <= POSTER_KEEP_BYTES) return null;
  const scale = Math.min(1, max / long);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v : null);

export function pickPosters(own: Partial<PosterPair> | null | undefined, tour?: Partial<PosterPair> | null): Posters {
  const mine = { wide: clean(own?.poster_url), tall: clean(own?.poster_tall_url) };
  const src = mine.wide || mine.tall ? mine : { wide: clean(tour?.poster_url), tall: clean(tour?.poster_tall_url) };
  return { wide: src.wide ?? src.tall, tall: src.tall ?? src.wide };
}

export const hasPoster = (p: Partial<PosterPair> | null | undefined) => !!(clean(p?.poster_url) || clean(p?.poster_tall_url));
