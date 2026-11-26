"use client";

import { useState } from "react";
import { ICON_BTN } from "@/components/icon-link";
import { ShareIcon, WhatsAppIcon } from "@/components/icons";
import { buildIcs } from "@/lib/show-page";

const btn =
  "flex min-h-11 flex-1 items-center justify-center rounded-button border-2 border-plum-line px-3 py-2.5 text-sm font-bold hover:border-spotlight-yellow md:text-[15px]";

/** Add to calendar (.ics), then Share (copy link) and WhatsApp as icon buttons (spec 6.1, item 8). */
export function ShowActions({
  id,
  slug,
  title,
  startsAt,
  endsAt,
  location,
  siteUrl,
}: {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${siteUrl}/shows/${slug}`;

  function addToCalendar() {
    const ics = buildIcs({
      uid: id,
      title,
      starts: new Date(startsAt),
      ends: endsAt ? new Date(endsAt) : null,
      location,
      url,
      now: new Date(),
    });
    const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slug}.ics`;
    a.click();
    URL.revokeObjectURL(href);
  }

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
      // The person closed the share sheet: nothing to do.
    }
  }

  return (
    <div className="flex gap-2 md:gap-2.5">
      <button type="button" onClick={addToCalendar} className={btn}>
        <span className="md:hidden">Calendar</span>
        <span className="hidden md:inline">Add to calendar</span>
      </button>
      <button type="button" onClick={share} className={ICON_BTN} aria-label="Share" title="Share">
        <ShareIcon />
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener"
        className={ICON_BTN}
        aria-label="Share on WhatsApp"
        title="Share on WhatsApp"
      >
        <WhatsAppIcon />
      </a>
      <span aria-live="polite" className={copied ? "self-center text-sm font-bold text-lavender-text" : "sr-only"}>
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
