/**
 * Spotlight carousel rules (docs/website-spec.md, section 9).
 * 1. Active placements first, ordered by priority (high first), then date.
 * 2. If there are fewer than `slots`, fill with "strong" signal shows this
 *    month, then the soonest upcoming shows. No show appears twice.
 */

export type SpotlightCandidate = {
  id: string;
  starts_at: string;
  display_signal: string;
};

export type SpotlightPlacement<T extends SpotlightCandidate> = T & {
  priority: number;
};

export type SpotlightSlide<T> = { show: T; source: "placement" | "strong" | "soonest" };

export function buildSpotlight<T extends SpotlightCandidate>(opts: {
  placements: SpotlightPlacement<T>[];
  upcoming: T[];
  monthEnd: Date;
  slots: number;
}): SpotlightSlide<T>[] {
  const { placements, upcoming, monthEnd, slots } = opts;
  const byDate = (a: SpotlightCandidate, b: SpotlightCandidate) =>
    Date.parse(a.starts_at) - Date.parse(b.starts_at);

  const slides: SpotlightSlide<T>[] = [];
  const used = new Set<string>();
  const add = (show: T, source: SpotlightSlide<T>["source"]) => {
    if (slides.length >= slots || used.has(show.id)) return;
    used.add(show.id);
    slides.push({ show, source });
  };

  [...placements]
    .sort((a, b) => b.priority - a.priority || byDate(a, b))
    .forEach((p) => add(p, "placement"));

  [...upcoming]
    .filter((s) => s.display_signal === "strong" && Date.parse(s.starts_at) < monthEnd.getTime())
    .sort(byDate)
    .forEach((s) => add(s, "strong"));

  [...upcoming].sort(byDate).forEach((s) => add(s, "soonest"));

  return slides;
}
