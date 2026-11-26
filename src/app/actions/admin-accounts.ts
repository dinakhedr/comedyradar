"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAccountAction } from "@/lib/admin-accounts";
import { getAdminAccount, requireSuperAdmin } from "@/lib/data/admin";
import { text, UUID } from "@/lib/profile-server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Admin Accounts (spec 11.5 item 5). Passwords are never seen: a reset sends the person a link from Supabase Auth. */

function back(form: FormData, msg: string) {
  const ret = text(form.get("ret"));
  const base = ret.startsWith("/admin/accounts") ? ret : "/admin/accounts";
  const u = new URL(base, "http://x");
  u.searchParams.set("msg", msg);
  redirect(`${u.pathname}?${u.searchParams}`);
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Sign out of all devices, suspend, or lift a suspension. */
export async function accountAction(form: FormData): Promise<void> {
  const me = await requireSuperAdmin();
  const id = text(form.get("id"));
  const action = text(form.get("action"));
  if (!UUID.test(id) || !isAccountAction(action)) return;
  if (id === me.id) return back(form, "protected");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_account_action", {
    p_id: id,
    p_action: action,
  });
  if (error) console.error("admin_account_action", error.message);
  refresh();
  back(
    form,
    error
      ? "error"
      : data === "ok"
        ? action
        : data === "protected"
          ? "protected"
          : "error",
  );
}

/** Emails the person a link to choose a new password. */
export async function sendPasswordReset(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  if (!UUID.test(id)) return;
  const account = await getAdminAccount(id);
  if (!account?.email) return back(form, "error");
  // A separate client with no saved session: the link must work in the person's
  // own browser, so it uses the one-time sign-in in the link (not the admin's cookies).
  const auth = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  ).auth;
  const { error } = await auth.resetPasswordForEmail(account.email, {
    redirectTo: `${await origin()}/auth/recovery`,
  });
  if (error) console.error("admin reset link", error.code);
  back(
    form,
    error
      ? error.code?.includes("rate_limit")
        ? "rate_limit"
        : "error"
      : "reset_sent",
  );
}

/** Changes the account type (Comedian / Manager or agent). It gives no rights by itself. */
export async function setAccountType(form: FormData): Promise<void> {
  await requireSuperAdmin();
  const id = text(form.get("id"));
  const type = text(form.get("type"));
  if (!UUID.test(id) || (type !== "comedian" && type !== "manager")) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_account_type", {
    p_id: id,
    p_type: type,
  });
  if (error) console.error("admin_set_account_type", error.message);
  refresh();
  back(form, !error && data === "ok" ? "type_saved" : "error");
}
