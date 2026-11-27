import type { BadgeTone } from "@/components/badge";
import type { ShowRow } from "@/lib/data/types";
import { withReferral } from "@/lib/ticket-links";

/** The small icon on a card pill (see CardPill). */
export type PillIcon = "new" | "strong" | "fading" | "soldout" | "group" | "visiting" | "place" | "tour" | "lineup" | "solo";
export type BadgeInfo = { label: string; tone: BadgeTone; icon?: PillIcon };

/** Short English country names for card pills ("AE" → "UAE"). */
const SHORT_COUNTRY: Record<string, string> = { AE: "UAE", GB: "UK", US: "USA" };
export function countryLabel(code: string): string {
  const c = code.toUpperCase();
  if (SHORT_COUNTRY[c]) return SHORT_COUNTRY[c];
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(c) ?? c;
  } catch {
    return c;
  }
}

/** Shows outside Egypt: the country, in place of the signal (Dina, 2026-11-27). */
export function placeBadge(show: Pick<ShowRow, "country_code">): BadgeInfo | null {
  if (!show.country_code || show.country_code.toUpperCase() === "EG") return null;
  return { label: countryLabel(show.country_code), tone: "white", icon: "place" };
}

/** The one badge on a Coming up card (sold out, signal, group show or visiting). */
export function cardBadge(show: ShowRow): BadgeInfo | null {
  const place = placeBadge(show);
  if (place) return place;
  if (show.status === "sold_out") return { label: "Sold out", tone: "purple", icon: "soldout" };
  if (show.display_signal === "strong") return { label: "Strong", tone: "pink", icon: "strong" };
  if (show.display_signal === "fading") return { label: "Fading", tone: "pink", icon: "fading" };
  if (show.display_signal === "new") return { label: "New", tone: "yellow", icon: "new" };
  if (show.headliner_type === "group") return { label: "Group show", tone: "purple", icon: "group" };
  if (show.zone === "inbound") return { label: "Visiting", tone: "yellow", icon: "visiting" };
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
  if (show.ticket_url) return { href: withReferral(show.ticket_url, show.slug), external: true };
  return { href: showHref(show), external: false };
}
