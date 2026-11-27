/** Pure helpers for the comedian and group pages (spec 6.3, 6.4). */
import type { BadgeInfo } from "./show-display";

type ShowLike = { zone: "local" | "outbound" | "inbound"; status: string; group_ids: string[] | null; performer_count: number; starts_at: string };

/** Type badge on a comedian's show: WITH [GROUP] · ON TOUR · LINEUP · SOLO (sold out wins). */
export function comedianShowBadge(show: ShowLike, groups: { id: string; name: string }[]): BadgeInfo {
  if (show.status === "sold_out") return { label: "Sold out", tone: "purple", icon: "soldout" };
  const group = groups.find((g) => (show.group_ids ?? []).includes(g.id));
  if (group) return { label: `With ${group.name}`, tone: "yellow", icon: "group" };
  if (show.zone === "outbound") return { label: "On tour", tone: "pink", icon: "tour" };
  if (show.performer_count > 1) return { label: "Lineup", tone: "purple", icon: "lineup" };
  return { label: "Solo", tone: "purple", icon: "solo" };
}

/** True when any show falls between `from` (inclusive) and `to` (exclusive). */
export function hasShowBetween(shows: { starts_at: string }[], from: Date, to: Date): boolean {
  return shows.some((s) => {
    const t = Date.parse(s.starts_at);
    return t >= from.getTime() && t < to.getTime();
  });
}

/** "SOLO TOUR" for the comedian's own tour, "WITH [GROUP]" for a group tour they are part of. */
export function tourLabel(tour: { owner_type: "comedian" | "group"; owner_name: string }): string {
  return tour.owner_type === "group" ? `With ${tour.owner_name}` : "Solo tour";
}
