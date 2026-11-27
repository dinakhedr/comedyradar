/**
 * Spotlight carousel rules (docs/website-spec.md, section 9).
 * Only the shows the super admin picks in Admin > Spotlight (active
 * placements) appear, ordered by priority (high first), then date.
 * There is no automatic fill: with no placements, the section is hidden.
 */

export type SpotlightCandidate = {
  id: string;
  starts_at: string;
};

export type SpotlightPlacement<T extends SpotlightCandidate> = T & {
  priority: number;
};

export type SpotlightSlide<T> = { show: T; source: "placement" };

export function buildSpotlight<T extends SpotlightCandidate>(opts: {
  placements: SpotlightPlacement<T>[];
  slots: number;
}): SpotlightSlide<T>[] {
  const { placements, slots } = opts;
  const used = new Set<string>();
  return [...placements]
    .sort((a, b) => b.priority - a.priority || Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .filter((p) => (used.has(p.id) ? false : (used.add(p.id), true)))
    .slice(0, slots)
    .map((show) => ({ show, source: "placement" as const }));
}
