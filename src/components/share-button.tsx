"use client";

import { useState } from "react";
import { ICON_BTN } from "./icon-link";
import { ShareIcon } from "./icons";

/**
 * Share as an icon button: opens the phone's share menu, or copies the link
 * where there is none and says "Link copied" beside the icon for 2 seconds.
 */
export function ShareButton({ title, url, label = "Share", className = ICON_BTN }: { title: string; url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The person closed the share menu: nothing to do.
    }
  }
  return (
    <span className="inline-flex items-center">
      <button type="button" onClick={share} className={className} aria-label={label} title={label}>
        <ShareIcon />
      </button>
      <span aria-live="polite" className={copied ? "ml-2 text-sm font-bold text-lavender-text" : ""}>
        {copied ? "Link copied" : ""}
      </span>
    </span>
  );
}
