import { sendGAEvent } from "@next/third-parties/google";
import { analyticsEnabled, ticketsClickEvent, type AnalyticsEvent, type PodcastPlatform } from "./analytics-events";

export * from "./analytics-events";

/**
 * Sends Google Analytics 4 events with `sendGAEvent`. Nothing is sent when
 * NEXT_PUBLIC_GA_ID is not set. Before a visitor accepts cookies, Google
 * receives only cookieless signals (Consent Mode v2).
 */

export function trackEvent(event: AnalyticsEvent) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  sendGAEvent("event", event.name, event.params ?? {});
}

export const trackTicketsClick = (show: Parameters<typeof ticketsClickEvent>[0]) => trackEvent(ticketsClickEvent(show));

export const trackSpotlightClick = (showId: string, slidePosition: number) =>
  trackEvent({ name: "spotlight_click", params: { show_id: showId, slide_position: slidePosition } });

export const trackPodcastLinkClick = (podcast: string, platform: PodcastPlatform) =>
  trackEvent({ name: "podcast_link_click", params: { podcast, platform } });

export const trackTrackClick = (profileType: "comedian" | "group", profileSlug: string) =>
  trackEvent({ name: "track_click", params: { profile_type: profileType, profile_slug: profileSlug } });

export const trackNewsletterSignup = () => trackEvent({ name: "newsletter_signup" });
