/** Requests page (spec 11.4 item 7): tabs, type filter and the words on each card. */

export type LinkType = "group_member" | "lineup_tag" | "podcast_cohost";

export type LinkRequest = {
  id: string;
  direction: "incoming" | "sent";
  type: LinkType;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  decided_at: string | null;
  from_name: string;
  target_name: string;
  target_slug: string;
  group_name: string | null;
  group_slug: string | null;
  show_title: string | null;
  show_slug: string | null;
  show_starts_at: string | null;
  show_city: string | null;
  podcast_name: string | null;
};

export const REQUEST_TABS = [
  { value: "incoming", label: "Incoming" },
  { value: "sent", label: "Sent" },
  { value: "history", label: "History" },
] as const;
export type RequestTab = (typeof REQUEST_TABS)[number]["value"];

export const REQUEST_KINDS = [
  { value: "lineup", label: "Lineup tags" },
  { value: "group", label: "Groups" },
  { value: "podcast", label: "Podcasts" },
  { value: "team", label: "Team invites" },
] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number]["value"];

export const requestTab = (v: unknown): RequestTab => (REQUEST_TABS.some((t) => t.value === v) ? (v as RequestTab) : "incoming");
export const requestKind = (v: unknown): RequestKind | null => (REQUEST_KINDS.some((t) => t.value === v) ? (v as RequestKind) : null);

export const kindOf = (t: LinkType): RequestKind => (t === "lineup_tag" ? "lineup" : t === "group_member" ? "group" : "podcast");

/** Which tab a link request belongs to: answered ones (either way) go to History. */
export function tabOf(r: Pick<LinkRequest, "direction" | "status">): RequestTab {
  if (r.status !== "pending") return "history";
  return r.direction;
}

/** One sentence that says what the request is about. */
export function describe(r: LinkRequest): string {
  const who = r.direction === "incoming" ? r.from_name : "You";
  if (r.type === "lineup_tag") return `${who} tagged ${r.target_name} in the lineup of ${r.show_title ?? "a show"}.`;
  if (r.type === "group_member") return `${who} added ${r.target_name} as a member of ${r.group_name ?? "a group"}.`;
  return `${who} added ${r.target_name} as a co-host of ${r.podcast_name ?? "a podcast"}.`;
}

export const TYPE_LABEL: Record<LinkType, string> = {
  lineup_tag: "Lineup tag",
  group_member: "Group",
  podcast_cohost: "Podcast",
};
