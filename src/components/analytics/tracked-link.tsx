"use client";

import type { ComponentProps } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

/**
 * A plain link that sends one Google Analytics event when clicked.
 * Server components build the event (lib/analytics-events.ts) and pass it in.
 */
export function TrackedLink({ event, onClick, ...props }: ComponentProps<"a"> & { event: AnalyticsEvent }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        trackEvent(event);
        onClick?.(e);
      }}
    />
  );
}
