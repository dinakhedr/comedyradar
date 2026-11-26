import type { BadgeTone } from "@/components/badge";
import type { ShowRow } from "@/lib/data/types";

export type BadgeInfo = { label: string; tone: BadgeTone };

/** The one badge on a Coming up card (sold out, signal, group show or visiting). */
export function cardBadge(show: ShowRow): BadgeInfo | null {
  if (show.status === "sold_out") return { label: "Sold out", tone: "purple" };
  if (show.display_signal === "strong") return { label: "Strong Signal", tone: "pink" };
  if (show.display_signal === "fading") return { label: "Fading Signal", tone: "pink" };
  if (show.display_signal === "new") return { label: "New Signal", tone: "yellow" };
  if (show.headliner_type === "group") return { label: "Group show", tone: "purple" };
  if (show.zone === "inbound") return { label: "Visiting", tone: "yellow" };
  return null;
}

/** Signal badge on a Spotlight slide. */
export function signalBadge(show: ShowRow): BadgeInfo | null {
  if (show.status === "sold_out") return { label: "Sold out", tone: "purple" };
  if (show.display_signal === "strong") return { label: "Strong Signal", tone: "pink" };
  if (show.display_signal === "fading") return { label: "Fading Signal", tone: "pink" };
  if (show.display_signal === "new") return { label: "New Signal", tone: "yellow" };
  return null;
}

/** Type badge on a Spotlight slide (GROUP SHOW, LINEUP, VISITING, ON TOUR, SOLO). */
export function typeBadge(show: ShowRow): BadgeInfo {
  if (show.headliner_type === "group") return { label: "Group show", tone: "purple" };
  if (show.zone === "inbound") return { label: "Visiting", tone: "purple" };
  if (show.zone === "outbound") return { label: "On tour", tone: "purple" };
  if (show.performer_count > 1) return { label: "Lineup", tone: "purple" };
  return { label: "Solo", tone: "purple" };
}

export function showHref(show: Pick<ShowRow, "slug">) {
  return `/shows/${show.slug}`;
}

export function performerHref(show: ShowRow): string | null {
  if (!show.headliner_slug) return null;
  return show.headliner_type === "group" ? `/groups/${show.headliner_slug}` : `/comedians/${show.headliner_slug}`;
}

/** Where "Get tickets" goes: the official seller, or the show page when there is no link. */
export function ticketLink(show: ShowRow): { href: string; external: boolean } {
  if (show.ticket_url) return { href: show.ticket_url, external: true };
  return { href: showHref(show), external: false };
}
