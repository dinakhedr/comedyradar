/**
 * The Google Analytics events Comedy Radar sends, and helpers that build them.
 * No browser code here, so server components can build an event and pass it
 * to a client link (see components/analytics/tracked-link.tsx).
 */

/** Google Analytics 4 Measurement ID (G-…). Analytics is off when it is empty. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
export const analyticsEnabled = GA_ID !== "";

export type Zone = "local" | "outbound" | "inbound";
export type PodcastPlatform = "apple" | "spotify" | "anghami" | "podu";

export type AnalyticsEvent =
  | {
      name: "get_tickets_click";
      params: { show_id: string; show_title: string; performer: string; city: string; zone: Zone };
    }
  | { name: "spotlight_click"; params: { show_id: string; slide_position: number } }
  | { name: "podcast_link_click"; params: { podcast: string; platform: PodcastPlatform } }
  | { name: "track_click"; params: { profile_type: "comedian" | "group"; profile_slug: string } }
  | { name: "newsletter_signup"; params?: Record<string, never> };

export function ticketsClickEvent(show: {
  id: string;
  title: string;
  performer: string | null | undefined;
  city: string;
  zone: Zone;
}): AnalyticsEvent {
  return {
    name: "get_tickets_click",
    params: { show_id: show.id, show_title: show.title, performer: show.performer ?? "", city: show.city, zone: show.zone },
  };
}

/** The GA platform name for a listen button label (YouTube is not tracked). */
export function podcastPlatform(label: string): PodcastPlatform | null {
  const key = label.toLowerCase().replace(/[^a-z]/g, "");
  if (key.startsWith("apple")) return "apple";
  if (key === "spotify") return "spotify";
  if (key === "anghami") return "anghami";
  if (key === "podu") return "podu";
  return null;
}
