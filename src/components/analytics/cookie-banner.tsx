"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  clearAnalyticsCookies,
  consentFor,
  OPEN_COOKIE_SETTINGS_EVENT,
  readChoice,
  saveChoice,
  type ConsentChoice,
} from "@/lib/consent";

type Gtag = (...args: unknown[]) => void;

const SERVER = "server";
const CHANGE_EVENT = "cr:cookie-consent-change";

/** Re-reads the saved choice when it changes here or in another tab. */
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Cookie banner (Radar Plum card, yellow Accept, outline Reject).
 * Shows until the visitor chooses; the choice is saved in localStorage and
 * the footer "Cookie settings" link opens it again.
 */
export function CookieBanner() {
  const saved = useSyncExternalStore(subscribe, readChoice, () => SERVER);
  const [reopened, setReopened] = useState(false);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reopen = () => {
      setReopened(true);
      // Move focus to the banner so keyboard users land on the choices.
      requestAnimationFrame(() => acceptRef.current?.focus());
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const choose = (choice: ConsentChoice) => {
    saveChoice(choice);
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    gtag?.("consent", "update", consentFor(choice));
    if (choice === "denied") clearAnalyticsCookies();
    setReopened(false);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  // Hidden while the page is rendered on the server; shown until the visitor chooses.
  const open = saved !== SERVER && (saved === null || reopened);
  const current = saved === SERVER ? null : saved;
  if (!open) return null;

  return (
    <section
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[560px] rounded-card border-2 border-plum-line bg-radar-plum p-5 text-white shadow-2xl md:bottom-6 md:p-6"
    >
      <h2 className="text-lg font-extrabold">Cookies on Comedy Radar</h2>
      <p className="mt-2 text-small leading-relaxed text-lavender">
        With your OK, we use Google Analytics cookies to count visits and see which shows people open, so we can make
        the site better. No ads, and we never sell your data.{" "}
        <Link href="/privacy#cookies" className="font-bold text-spotlight-yellow underline hover:text-white">
          Cookies and analytics
        </Link>
      </p>
      {current && (
        <p className="mt-2 text-small text-lavender-text">
          Your choice now: <span className="font-bold text-white">{current === "granted" ? "accepted" : "rejected"}</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          ref={acceptRef}
          type="button"
          onClick={() => choose("granted")}
          className="min-h-11 flex-1 rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple hover:bg-white"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          className="min-h-11 flex-1 rounded-button border-2 border-white px-5 font-extrabold text-white hover:border-spotlight-yellow hover:text-spotlight-yellow"
        >
          Reject
        </button>
      </div>
    </section>
  );
}
