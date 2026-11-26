"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/data/dashboard";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Requests (spec 11.4 item 7): answer a link request, or cancel one you sent. */

const back = (tab: string, done: string) => redirect(`/dashboard/requests?${tab === "incoming" ? "" : `tab=${tab}&`}done=${done}`);

export async function answerLinkRequest(form: FormData): Promise<void> {
  const account = await requireAccount();
  if (account.is_suspended) return;
  const id = text(form.get("request_id"));
  if (!UUID.test(id)) return;
  const accept = text(form.get("answer")) === "accept";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("answer_link_request", { p_id: id, p_accept: accept });
  if (error) console.error("answer_link_request", error.message);
  refresh();
  if (data === "ok") {
    updateTag("shows");
    updateTag("profiles");
    back("incoming", accept ? "accepted" : "declined");
  }
  back("incoming", "gone");
}

export async function cancelLinkRequest(form: FormData): Promise<void> {
  const account = await requireAccount();
  if (account.is_suspended) return;
  const id = text(form.get("request_id"));
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_link_request", { p_id: id });
  if (error) console.error("cancel_link_request", error.message);
  refresh();
  if (data === "ok") updateTag("shows");
  back("sent", data === "ok" ? "cancelled" : "gone");
}
