/** Newsletter sign-up helpers (spec 5.7, phase 1 step 6). */

export type NewsletterState = { status: "idle" | "ok" | "invalid" | "slow_down" | "error"; message: string };

export const NEWSLETTER_IDLE: NewsletterState = { status: "idle", message: "" };

/** Forms sent faster than this after the page loaded are treated as bots. */
export const MIN_FILL_MS = 1500;

const EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** Trims and lowercases an email; null when it does not look like one. Same rule as the database. */
export function cleanEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** The visitor's IP from the request headers (Vercel puts the real one first). */
export function clientIp(forwardedFor: string | null, realIp: string | null): string {
  return forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
}

/** Looks like a bot: the hidden field was filled in, or the form was sent too fast. */
export function looksLikeBot(honeypot: unknown, startedAt: unknown, now: number): boolean {
  if (typeof honeypot === "string" && honeypot.trim() !== "") return true;
  const started = Number(startedAt);
  return !Number.isFinite(started) || now - started < MIN_FILL_MS;
}

export const NEWSLETTER_MESSAGES: Record<Exclude<NewsletterState["status"], "idle">, string> = {
  ok: "You're on the radar! New shows and tours will come to your inbox.",
  invalid: "That email doesn't look right. Please check it and try again.",
  slow_down: "Too many tries. Please wait a little and try again.",
  error: "Something went wrong on our side. Please try again in a minute.",
};
