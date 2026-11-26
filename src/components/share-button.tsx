"use client";

import { useState } from "react";

/** Opens the phone's share menu, or copies the link where there is none. */
export function ShareButton({ title, url, label = "Share", className = "" }: { title: string; url: string; label?: string; className?: string }) {
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
    <button type="button" onClick={share} className={className} aria-live="polite">
      {copied ? "Link copied" : label}
    </button>
  );
}
