import { WHEN_FILTERS, whenRange, type WhenFilter } from "./dates";

/**
 * The homepage "when" choice. With no chip picked ("all"), Coming up lists the
 * next shows whatever their date. The chips narrow it to Tonight, This weekend
 * or This month.
 */
export type HomeWhen = WhenFilter | "all";

export function parseHomeWhen(value: string | string[] | undefined): HomeWhen {
  const v = Array.isArray(value) ? value[0] : value;
  return WHEN_FILTERS.includes(v as WhenFilter) ? (v as WhenFilter) : "all";
}

/** The time window for the homepage choice, in UTC. "all" has no end. */
export function homeWindow(when: HomeWhen, now: Date): { from: Date; to: Date | null } {
  return when === "all" ? { from: now, to: null } : whenRange(when, now);
}
