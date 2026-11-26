"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Field, FormMessage, PasswordField, primaryBtn } from "./fields";

export function SignInForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {notice && !state.message && <FormMessage message={notice} />}
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} maxLength={254} />
      <PasswordField label="Password" name="password" autoComplete="current-password" />
      <Link href="/forgot-password" className="-mt-1 self-end text-sm font-extrabold text-radar-purple underline">
        Forgot password?
      </Link>
      <FormMessage message={state.message} />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
