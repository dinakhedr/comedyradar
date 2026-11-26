"use client";

import { useEffect } from "react";
import type { StatKind } from "@/lib/page-stats";

function send(kind: StatKind, id: string) {
  const body = JSON.stringify({ kind, id });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
}

/** Counts one view of a public page, once per browser tab session. */
export function TrackView({ kind, id }: { kind: StatKind; id: string }) {
  useEffect(() => {
    const key = `cr-view:${kind}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked: still count
    }
    send(kind, id);
  }, [kind, id]);
  return null;
}

/** Counts clicks on any "Get tickets" link marked with data-ticket-show="<show id>". */
export function TicketClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[data-ticket-show]");
      const id = link?.getAttribute("data-ticket-show");
      if (id) send("ticket_click", id);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
