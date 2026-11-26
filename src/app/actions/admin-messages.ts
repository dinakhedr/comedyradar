"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { messageStatusOf } from "@/lib/contact";
import { requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/** Marks a contact message new, replied or closed. Row security lets only the super admin do it. */
export async function setMessageStatus(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const status = messageStatusOf(text(form.get("status")));
  const ret = text(form.get("ret"));
  const back = ret.startsWith("/admin/messages") ? ret : "/admin/messages";
  if (!UUID.test(id) || !status) redirect(back);
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", id);
  if (error) console.error("contact_messages update", error.message);
  refresh();
  const u = new URL(back, "http://x");
  u.searchParams.set("msg", error ? "error" : status);
  redirect(`${u.pathname}?${u.searchParams}#m-${id}`);
}
