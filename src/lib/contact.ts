/** Contact form (spec 7.5 item 3): choices, prefill and checks. Same rules as the database function contact_send(). */

export const SENDER_TYPES = [
  { value: "fan", label: "A fan" },
  { value: "comedian", label: "A comedian" },
  { value: "manager", label: "A manager or agent" },
  { value: "venue", label: "A venue or organiser" },
  { value: "press", label: "Press" },
  { value: "other", label: "Something else" },
] as const;

export const CONTACT_TOPICS = [
  { value: "wrong_detail", label: "A show detail is wrong" },
  { value: "cancelled", label: "A show was cancelled or moved" },
  { value: "update_or_remove", label: "Update or remove my profile or photo" },
  { value: "claim_help", label: "Help with claiming a profile" },
  { value: "partnership", label: "Partnership or Spotlight" },
  { value: "other", label: "Something else" },
] as const;

export const MESSAGE_STATUSES = [
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
] as const;

export type SenderType = (typeof SENDER_TYPES)[number]["value"];
export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]["value"];

export const senderTypeOf = (v: unknown): SenderType | "" =>
  SENDER_TYPES.some((t) => t.value === v) ? (v as SenderType) : "";
export const contactTopicOf = (v: unknown): ContactTopic | "" =>
  CONTACT_TOPICS.some((t) => t.value === v) ? (v as ContactTopic) : "";
export const messageStatusOf = (v: unknown): MessageStatus | "" =>
  MESSAGE_STATUSES.some((t) => t.value === v) ? (v as MessageStatus) : "";

export const senderLabel = (v: string | null) =>
  SENDER_TYPES.find((t) => t.value === v)?.label ?? "Not said";
export const topicLabel = (v: string | null) =>
  CONTACT_TOPICS.find((t) => t.value === v)?.label ?? "Not said";

/** A page link worth keeping: a site path or an http(s) address, at most 500 characters. */
export function cleanPageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v.length > 500) return null;
  return /^(https?:\/\/|\/)/i.test(v) && !/\s/.test(v) ? v : null;
}

/** The Contact form with the topic and the page link filled in ("Report a correction"). */
export function contactHref(topic: ContactTopic, page?: string): string {
  const u = new URLSearchParams({ topic });
  if (page) u.set("page", page);
  return `/contact?${u}`;
}

export type ContactFields = {
  name: string;
  email: string;
  sender_type: SenderType | "";
  topic: ContactTopic | "";
  page_url: string | null;
  message: string;
};

export type ContactState = {
  status: "idle" | "ok" | "invalid" | "slow_down" | "error";
  message: string;
  errors?: Partial<
    Record<"name" | "email" | "message" | "page_url" | "consent", string>
  >;
  /** What was typed, so the form keeps it when a field needs fixing. */
  values?: Record<
    "name" | "email" | "sender_type" | "topic" | "page_url" | "message",
    string
  >;
};

export const CONTACT_IDLE: ContactState = { status: "idle", message: "" };

export const CONTACT_MESSAGES: Record<
  Exclude<ContactState["status"], "idle">,
  string
> = {
  ok: "Thanks! Your message is on the radar. We reply by email, usually within a few days.",
  invalid: "Please check the fields marked above.",
  slow_down:
    "Too many messages from here just now. Please wait a little and try again.",
  error:
    "Something went wrong on our side. Please try again in a minute, or email us.",
};
