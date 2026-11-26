/**
 * One source of truth for status colours (docs/brand-assets.md, "Status").
 * Five kinds: Published green, Pending yellow, Draft light grey,
 * Archived white with an outline, Rejected red.
 */
export type StatusKind = "published" | "pending" | "draft" | "archived" | "rejected";

export const STATUS_KINDS: StatusKind[] = ["published", "pending", "draft", "archived", "rejected"];

export const STATUS_LABELS: Record<StatusKind, string> = {
  published: "Published",
  pending: "Pending",
  draft: "Draft",
  archived: "Archived",
  rejected: "Rejected",
};

/** Colours for a status pill (tables and grids) and a round status icon (compact lists). */
export const STATUS_COLORS: Record<StatusKind, string> = {
  published: "bg-[#157a3f] text-white",
  pending: "bg-spotlight-yellow text-radar-purple",
  draft: "border-2 border-dashed border-[#a39cb3] bg-[#eceaf0] text-[#5b5470]",
  archived: "border-2 border-[#a39cb3] bg-white text-[#5b5470]",
  rejected: "bg-[#d12a1f] text-white",
};

/** Words that mean the same thing as one of the five kinds. */
const ALIASES: Record<string, StatusKind> = {
  published: "published",
  live: "published",
  approved: "published",
  accepted: "published",
  verified: "published",
  pending: "pending",
  in_review: "pending",
  waiting: "pending",
  draft: "draft",
  archived: "archived",
  expired: "archived",
  rejected: "rejected",
  declined: "rejected",
};

/** Map a database status (or a synonym) to one of the five kinds. Unknown values count as Draft. */
export function statusKind(status: string | null | undefined): StatusKind {
  const key = (status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[key] ?? "draft";
}
