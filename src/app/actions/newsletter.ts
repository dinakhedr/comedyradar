"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import {
  cleanEmail,
  clientIp,
  looksLikeBot,
  NEWSLETTER_MESSAGES,
  type NewsletterState,
} from "@/lib/newsletter";

/**
 * Newsletter sign-up from the yellow band (spec 5.7). The database function
 * newsletter_subscribe() saves the email and limits how often one visitor can
 * try; only a one-way hash of the visitor's IP address is sent to it.
 */
export async function subscribeToNewsletter(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const done = (status: Exclude<NewsletterState["status"], "idle">): NewsletterState => ({
    status,
    message: NEWSLETTER_MESSAGES[status],
  });

  // Bots get the normal thank-you, so they learn nothing.
  if (looksLikeBot(form.get("website"), form.get("started"), Date.now())) return done("ok");

  const email = cleanEmail(form.get("email"));
  if (!email) return done("invalid");

  const db = createPublicClient();
  if (!db) return done("error");

  const h = await headers();
  const client = createHash("sha256")
    .update(`comedy-radar-newsletter:${clientIp(h.get("x-forwarded-for"), h.get("x-real-ip"))}`)
    .digest("hex");

  const { data, error } = await db.rpc("newsletter_subscribe", { p_email: email, p_client: client });
  if (error) {
    console.error("newsletter_subscribe", error.message);
    return done("error");
  }
  return done(data === "invalid" || data === "slow_down" ? data : "ok");
}
