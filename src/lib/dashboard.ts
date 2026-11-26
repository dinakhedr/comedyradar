/** Helpers for the creator dashboard (docs/website-spec.md 11.4). */

export type ManagedProfile = {
  kind: "comedian" | "group";
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  status: "draft" | "pending" | "published" | "archived";
  verified: boolean;
  role: ProfileRole;
};

export type ProfileRole = "admin" | "moderator";

/** "c:badr-nour" or "g:highfive": the profile switcher value kept in the address (?p=). */
export const profileKey = (p: Pick<ManagedProfile, "kind" | "slug">) => `${p.kind === "group" ? "g" : "c"}:${p.slug}`;

/** The profile picked in the switcher, or null for "All profiles". */
export function pickProfile(profiles: ManagedProfile[], raw: unknown): ManagedProfile | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return null;
  return profiles.find((p) => profileKey(p) === v) ?? null;
}

/** Status line of a profile card: Verified / Live / Pending review / Draft / Archived. */
export function profileStatus(p: Pick<ManagedProfile, "status" | "verified">): { label: string; tone: "pink" | "yellow" | "purple" | "outline" } {
  if (p.status === "published") return p.verified ? { label: "Verified", tone: "yellow" } : { label: "Live", tone: "purple" };
  if (p.status === "pending") return { label: "Pending review", tone: "pink" };
  if (p.status === "archived") return { label: "Archived", tone: "outline" };
  return { label: "Draft", tone: "outline" };
}

export const SHOW_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "In review",
  published: "Live",
  sold_out: "Sold out",
  cancelled: "Cancelled",
};

export const ROLE_LABELS = { admin: "Admin", moderator: "Moderator" } as const;

/** "Dina" from "Dina Khedr"; falls back to "there" ("Hi there"). */
export function firstName(name: string | null | undefined): string {
  const f = (name ?? "").trim().split(/\s+/)[0];
  return f || "there";
}
