/** Review queue (spec 11.5 item 2): tabs, labels and item types. */

export type ReviewType = "claims" | "profiles" | "shows" | "venues" | "names";

export type ReviewItem = {
  type: ReviewType;
  id: string;
  created_at: string | null;
  title: string;
  sub: string | null;
  flag: string | null;
  detail: Record<string, unknown>;
};

export type DoneItem = { type: "claims" | "names"; id: string; title: string; sub: string; status: "approved" | "rejected"; decided_at: string; reason: string | null };

export type ReviewQueue = { pending: ReviewItem[]; done: DoneItem[] };

export const REVIEW_TABS = [
  { value: "all", label: "All" },
  { value: "profiles", label: "New profiles" },
  { value: "claims", label: "Claims" },
  { value: "shows", label: "Shows" },
  { value: "venues", label: "Venues" },
  { value: "names", label: "Name changes" },
  { value: "done", label: "Done" },
] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number]["value"];

export const reviewTab = (v: unknown): ReviewTab => (REVIEW_TABS.some((t) => t.value === v) ? (v as ReviewTab) : "all");

export const TYPE_LABELS: Record<ReviewType, string> = {
  claims: "Claim",
  profiles: "New profile",
  shows: "Show",
  venues: "Venue",
  names: "Name change",
};

export const RELATION_LABELS: Record<string, string> = {
  self: "The comedian",
  manager: "The manager",
  member: "A member of the group",
};

export const PROOF_LABELS: Record<string, string> = {
  official_dm: "Message from the official account",
  comedian_confirms: "The comedian or a group member confirms",
  document: "Document",
  business_email: "Business email",
};

/** Items for a tab, oldest first (the queue comes sorted). */
export function itemsFor(tab: ReviewTab, items: ReviewItem[]): ReviewItem[] {
  if (tab === "all" || tab === "done") return tab === "all" ? items : [];
  return items.filter((i) => i.type === tab);
}

/** "today", "1 day", "3 days" since a date. */
export function waited(iso: string | null, now: Date): string {
  if (!iso) return "";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}
