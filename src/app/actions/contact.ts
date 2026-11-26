"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import {
  cleanPageUrl,
  CONTACT_MESSAGES,
  contactTopicOf,
  senderTypeOf,
  type ContactState,
} from "@/lib/contact";
import { cleanEmail, clientIp, looksLikeBot } from "@/lib/newsletter";
import { createPublicClient } from "@/lib/supabase/public";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/**
 * Contact form (spec 7.5 item 3). The database function contact_send() checks
 * the fields again, saves the message and limits how often one visitor can
 * send; only a one-way hash of the visitor's IP address is sent to it.
 */
export async function sendContactMessage(
  _prev: ContactState,
  form: FormData,
): Promise<ContactState> {
  // Bots get the normal thank-you, so they learn nothing.
  if (looksLikeBot(form.get("website"), form.get("started"), Date.now()))
    return { status: "ok", message: CONTACT_MESSAGES.ok };

  const name = str(form.get("name")).replace(/\s+/g, " ").trim();
  const email = cleanEmail(form.get("email"));
  const message = str(form.get("message")).trim();
  const rawPage = str(form.get("page_url")).trim();
  const page = cleanPageUrl(rawPage);

  const errors: ContactState["errors"] = {};
  if (name.length < 1 || name.length > 100)
    errors.name = "Please write your name (up to 100 characters).";
  if (!email) errors.email = "That email doesn't look right.";
  if (message.length < 2 || message.length > 4000)
    errors.message = "Please write a message (up to 4,000 characters).";
  if (rawPage && !page)
    errors.page_url = "Paste a link that starts with https://";
  if (form.get("consent") !== "yes")
    errors.consent = "Please tick the box so we can reply to you.";
  const values = {
    name: str(form.get("name")).slice(0, 100),
    email: str(form.get("email")).slice(0, 254),
    sender_type: str(form.get("sender_type")).slice(0, 20),
    topic: str(form.get("topic")).slice(0, 30),
    page_url: rawPage.slice(0, 500),
    message: str(form.get("message")).slice(0, 4000),
  };
  if (Object.keys(errors).length > 0)
    return {
      status: "invalid",
      message: CONTACT_MESSAGES.invalid,
      errors,
      values,
    };

  const db = createPublicClient();
  if (!db) return { status: "error", message: CONTACT_MESSAGES.error, values };

  const h = await headers();
  const client = createHash("sha256")
    .update(
      `comedy-radar-contact:${clientIp(h.get("x-forwarded-for"), h.get("x-real-ip"))}`,
    )
    .digest("hex");

  const { data, error } = await db.rpc("contact_send", {
    p_name: name,
    p_email: email,
    p_sender_type: senderTypeOf(str(form.get("sender_type"))) || null,
    p_topic: contactTopicOf(str(form.get("topic"))) || null,
    p_page_url: page,
    p_message: message,
    p_client: client,
  });
  if (error) {
    console.error("contact_send", error.message);
    return { status: "error", message: CONTACT_MESSAGES.error, values };
  }
  const status: Exclude<ContactState["status"], "idle"> =
    data === "ok" || data === "slow_down" || data === "invalid"
      ? data
      : "error";
  return {
    status,
    message: CONTACT_MESSAGES[status],
    values: status === "ok" ? undefined : values,
  };
}
