"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authMessage,
  checkNewPassword,
  checkSignUp,
  cleanEmail,
  safeNext,
  type FieldErrors,
} from "@/lib/auth-forms";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { ok?: boolean; message?: string; errors?: FieldErrors; email?: string };

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const NOT_SET_UP = "Sign-in is not available right now. Please try again later.";

/** The address of this site for links in emails (production or preview). */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function configured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

/** Sign up with email and password (spec 11.4 item 1). Supabase sends the confirmation email. */
export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const input = {
    name: text(form.get("name")).trim(),
    email: cleanEmail(form.get("email")),
    password: text(form.get("password")),
    confirm: text(form.get("confirm")),
    type: text(form.get("type")),
    terms: form.get("terms") === "on",
  };
  const errors = checkSignUp(input);
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted fields." };
  if (!configured()) return { message: NOT_SET_UP };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/confirm?next=/dashboard`,
      // Used only for the display name and the account type (see private.handle_new_user).
      data: { full_name: input.name, account_type: input.type },
    },
  });
  if (error) return { message: authMessage(error.code, "We couldn't create your account. Please try again.") };
  // With email confirmation on, Supabase does not say whether the email was already used.
  if (data.session) redirect("/dashboard");
  return { ok: true, email: input.email };
}

/** Sign in with email and password. */
export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = cleanEmail(form.get("email"));
  const password = text(form.get("password"));
  if (!email || !password) return { message: "Please enter your email and password." };
  if (!configured()) return { message: NOT_SET_UP };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: authMessage(error.code, "We couldn't sign you in. Please try again."), email };
  redirect(safeNext(form.get("next")));
}

/** Sends a password reset link. The answer is the same whether or not the email has an account. */
export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = cleanEmail(form.get("email"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { errors: { email: "Please enter a valid email address." } };
  if (!configured()) return { message: NOT_SET_UP };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/confirm?next=/reset-password`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { message: authMessage(error.code, "") };
  }
  return { ok: true, email };
}

/** Saves a new password for the signed-in user (after the reset link). */
export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = text(form.get("password"));
  const errors = checkNewPassword(password, text(form.get("confirm")));
  if (Object.keys(errors).length) return { errors, message: "Please check the highlighted fields." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { message: "Your reset link has expired. Please ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: authMessage(error.code, "We couldn't save your new password. Please try again.") };
  redirect("/dashboard?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/signin");
}
