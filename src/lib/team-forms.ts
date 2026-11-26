/**
 * Team and access (docs/website-spec.md 11.4 item 6). Pure checks, shared by
 * the invite panel and the server actions.
 */

export const ROLES = [
  { value: "admin", label: "Admin", help: "Edits the profile, manages the team and members, adds shows and tours." },
  { value: "moderator", label: "Moderator", help: "Adds and edits shows and tours, marks them sold out or cancelled. No profile edits, no team changes." },
] as const;
export type Role = (typeof ROLES)[number]["value"];
export const isRole = (v: unknown): v is Role => v === "admin" || v === "moderator";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Shareable = { kind: "comedian" | "group"; id: string };
export type AccessChoice = { scope: "all"; role: Role } | { scope: "selected"; profiles: (Shareable & { role: Role })[] };
export type TeamErrors = Partial<Record<"email" | "access", string>>;

/**
 * Reads the access part of the invite or edit form: "All profiles in this
 * dashboard" with one role, or the ticked profiles with a role each. Only
 * `shareable` profiles (where the owner is admin) can be picked.
 */
export function checkAccess(
  f: { scope: string; all_role: string; picked: string[]; roleOf: (key: string) => string },
  shareable: Shareable[],
): { access?: AccessChoice; error?: string } {
  if (f.scope === "all") {
    if (!isRole(f.all_role)) return { error: "Please choose a role." };
    return { access: { scope: "all", role: f.all_role } };
  }
  if (f.scope !== "selected") return { error: "Please choose what they can access." };
  const keyOf = (p: Shareable) => `${p.kind === "group" ? "g" : "c"}:${p.id}`;
  const profiles = [...new Set(f.picked)].flatMap((key) => {
    const p = shareable.find((s) => keyOf(s) === key);
    const role = f.roleOf(key);
    return p ? [{ ...p, role: isRole(role) ? role : ("moderator" as Role) }] : [];
  });
  if (!profiles.length) return { error: "Please tick at least one profile." };
  return { access: { scope: "selected", profiles } };
}

export function checkInvite(
  f: { email: string; scope: string; all_role: string; picked: string[]; roleOf: (key: string) => string },
  shareable: Shareable[],
  ownEmail: string,
): { email?: string; access?: AccessChoice; errors: TeamErrors } {
  const errors: TeamErrors = {};
  const email = f.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) errors.email = "Please enter their email, like name@example.com.";
  else if (email === ownEmail.trim().toLowerCase()) errors.email = "This is your own email.";
  const a = checkAccess(f, shareable);
  if (a.error) errors.access = a.error;
  if (Object.keys(errors).length) return { errors };
  return { email, access: a.access, errors };
}

/** "All profiles · Moderator", or one chip per profile like "HighFive · Admin". */
export function accessChips(
  m: { scope: string; all_role: string | null },
  rows: { name: string; role: string }[],
): string[] {
  const label = (r: string | null) => ROLES.find((x) => x.value === r)?.label ?? "Moderator";
  if (m.scope === "all") return [`All profiles · ${label(m.all_role)}`];
  return [...rows].sort((a, b) => a.name.localeCompare(b.name)).map((r) => `${r.name} · ${label(r.role)}`);
}
