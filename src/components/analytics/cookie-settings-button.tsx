"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/consent";

/** Footer "Cookie settings": opens the cookie banner again so visitors can change their choice. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}>
      Cookie settings
    </button>
  );
}
