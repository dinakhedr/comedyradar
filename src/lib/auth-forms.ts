/**
 * Sign-up and sign-in rules (docs/website-spec.md 11.3 "Security", 11.4 item 1).
 * Supabase Auth checks the same rules again; these give clear messages first.
 */

export const PASSWORD_MIN = 8;

export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN} characters`, test: (p: string) => p.length >= PASSWORD_MIN },
  { id: "number", label: "A number or a symbol", test: (p: string) => /[^A-Za-z]/.test(p) },
] as const;

/** 0 (empty) to 4 (strong), for the strength meter. */
export function passwordStrength(p: string): 0 | 1 | 2 | 3 | 4 {
  if (!p) return 0;
  let score = 0;
  if (p.length >= PASSWORD_MIN) score++;
  if (p.length >= 12) score++;
  if (/[0-9]/.test(p) && /[A-Za-z]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))) score++;
  return Math.max(1, score) as 1 | 2 | 3 | 4;
}

export const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

export const passwordOk = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

export const ACCOUNT_TYPES = [
  { value: "comedian", label: "A comedian", hint: "Solo, in a group, or both" },
  { value: "manager", label: "A manager or agent", hint: "One comedian, several, or a group" },
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

export type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirm" | "type" | "terms", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const cleanEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

export type SignUpInput = { name: string; email: string; password: string; confirm: string; type: string; terms: boolean };

export function checkSignUp(f: SignUpInput): FieldErrors {
  const e: FieldErrors = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  else if (f.name.length > 80) e.name = "Please use a shorter name.";
  if (!EMAIL.test(f.email) || f.email.length > 254) e.email = "Please enter a valid email address.";
  if (!passwordOk(f.password)) e.password = `Use at least ${PASSWORD_MIN} characters with a number or a symbol.`;
  else if (f.password.length > 72) e.password = "Please use at most 72 characters.";
  if (f.confirm !== f.password) e.confirm = "The two passwords are not the same.";
  if (!ACCOUNT_TYPES.some((t) => t.value === f.type)) e.type = "Please choose who you are.";
  if (!f.terms) e.terms = "Please accept the terms to continue.";
  return e;
}

export function checkNewPassword(password: string, confirm: string): FieldErrors {
  const e: FieldErrors = {};
  if (!passwordOk(password)) e.password = `Use at least ${PASSWORD_MIN} characters with a number or a symbol.`;
  else if (password.length > 72) e.password = "Please use at most 72 characters.";
  if (confirm !== password) e.confirm = "The two passwords are not the same.";
  return e;
}

/** Only paths inside this site are allowed after signing in (no open redirects). */
export function safeNext(v: unknown, fallback = "/dashboard"): string {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  return v.slice(0, 300);
}

/** Supabase Auth error codes turned into plain messages. */
export function authMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match. Please try again.";
    case "email_not_confirmed":
      return "Please confirm your email first. We sent you a link when you signed up.";
    case "user_already_exists":
    case "email_exists":
      return "There is already an account with this email. Try signing in instead.";
    case "weak_password":
      return "This password is too weak or has appeared in a data leak. Please choose another one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many tries. Please wait a few minutes and try again.";
    case "same_password":
      return "Your new password must be different from the old one.";
    default:
      return fallback;
  }
}
