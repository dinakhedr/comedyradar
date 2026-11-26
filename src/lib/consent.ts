/**
 * Cookie consent for Google Analytics (Google Consent Mode v2).
 * Everything starts "denied"; only "analytics_storage" is turned on when a
 * visitor presses Accept. Comedy Radar shows no ads, so the three ad signals
 * always stay denied.
 */

/** Where the visitor's choice is saved in the browser (localStorage). */
export const CONSENT_STORAGE_KEY = "cr-cookie-consent";

/** Fired on window to open the cookie banner again (footer "Cookie settings"). */
export const OPEN_COOKIE_SETTINGS_EVENT = "cr:open-cookie-settings";

export type ConsentChoice = "granted" | "denied";

export type ConsentState = {
  ad_storage: ConsentChoice;
  analytics_storage: ConsentChoice;
  ad_user_data: ConsentChoice;
  ad_personalization: ConsentChoice;
};

export const DEFAULT_CONSENT: ConsentState = {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

/** The consent update sent to Google for a visitor's choice. */
export function consentFor(choice: ConsentChoice): ConsentState {
  return { ...DEFAULT_CONSENT, analytics_storage: choice };
}

/** Reads a saved value; anything unexpected counts as "no choice yet". */
export function parseChoice(value: string | null | undefined): ConsentChoice | null {
  return value === "granted" || value === "denied" ? value : null;
}

export function readChoice(): ConsentChoice | null {
  try {
    return parseChoice(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveChoice(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

/**
 * Inline script that runs before Google Analytics loads: sets every consent
 * signal to denied, then applies a choice saved on an earlier visit so a
 * returning visitor who accepted is counted from the first page.
 */
export function consentDefaultsScript(): string {
  const key = JSON.stringify(CONSENT_STORAGE_KEY);
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    `gtag('consent','default',${JSON.stringify({ ...DEFAULT_CONSENT, wait_for_update: 500 })});`,
    "try{",
    `if(localStorage.getItem(${key})==='granted'){gtag('consent','update',${JSON.stringify(consentFor("granted"))});}`,
    "}catch(e){}",
  ].join("");
}

/** Removes Google Analytics cookies (_ga, _ga_XXXX) after a visitor rejects. */
export function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}
