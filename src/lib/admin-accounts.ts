/** Admin Accounts (spec 11.5 item 5): filters and labels. */

export const ACCOUNT_TYPES = [
  { value: "comedian", label: "Comedians" },
  { value: "manager", label: "Managers or agents" },
  { value: "team", label: "Team members" },
] as const;

export const ACCOUNT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "unconfirmed", label: "Email not confirmed" },
  { value: "suspended", label: "Suspended" },
] as const;

export const ACCOUNT_ACTIONS = ["signout", "suspend", "unsuspend"] as const;
export type AccountAction = (typeof ACCOUNT_ACTIONS)[number];

export const accountTypeOf = (v?: string) =>
  ACCOUNT_TYPES.some((t) => t.value === v) ? (v as string) : "";
export const accountStatusOf = (v?: string) =>
  ACCOUNT_STATUSES.some((t) => t.value === v) ? (v as string) : "";
export const isAccountAction = (v: string): v is AccountAction =>
  (ACCOUNT_ACTIONS as readonly string[]).includes(v);

/** "Email", "Google" … from the Supabase sign-up provider. */
export function signUpMethod(provider: string | null | undefined): string {
  const p = (provider ?? "email").toLowerCase();
  if (p === "email") return "Email and password";
  return p.charAt(0).toUpperCase() + p.slice(1);
}
