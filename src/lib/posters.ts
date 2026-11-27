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

const clean = (v: string | null | undefined) => (v && v.trim() ? v : null);

export function pickPosters(own: Partial<PosterPair> | null | undefined, tour?: Partial<PosterPair> | null): Posters {
  const mine = { wide: clean(own?.poster_url), tall: clean(own?.poster_tall_url) };
  const src = mine.wide || mine.tall ? mine : { wide: clean(tour?.poster_url), tall: clean(tour?.poster_tall_url) };
  return { wide: src.wide ?? src.tall, tall: src.tall ?? src.wide };
}

export const hasPoster = (p: Partial<PosterPair> | null | undefined) => !!(clean(p?.poster_url) || clean(p?.poster_tall_url));
