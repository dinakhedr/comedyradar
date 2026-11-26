"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/actions/auth";
import { ACCOUNT_TYPES } from "@/lib/auth-forms";
import { errorCls, Field, FormMessage, PasswordField, primaryBtn } from "./fields";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <h2 className="font-display text-[28px] text-radar-purple">Check your email</h2>
        <p className="text-base text-radar-purple">
          We sent a confirmation link to <strong>{state.email}</strong>. Open it to finish creating your account, then
          you can sign in.
        </p>
        <p className="text-sm text-radar-purple/80">
          Nothing after a few minutes? Check your spam folder. If this email already has an account,{" "}
          <Link href="/signin" className="font-extrabold underline">
            sign in
          </Link>{" "}
          or{" "}
          <Link href="/forgot-password" className="font-extrabold underline">
            reset your password
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Full name" name="name" autoComplete="name" error={e.name} maxLength={80} />
      <Field label="Email" name="email" type="email" autoComplete="email" error={e.email} maxLength={254} />
      <PasswordField label="Password" name="password" autoComplete="new-password" error={e.password} meter />
      <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" error={e.confirm} />

      <fieldset className="flex flex-col gap-2" aria-describedby={e.type ? "type-err" : undefined}>
        <legend className="mb-1.5 text-[15px] font-extrabold text-radar-purple">I am…</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCOUNT_TYPES.map((t, i) => (
            <label
              key={t.value}
              className="flex cursor-pointer gap-2.5 rounded-button border-2 border-radar-purple/25 bg-white p-3 text-radar-purple has-[:checked]:border-radar-purple has-[:checked]:bg-lavender"
            >
              <input type="radio" name="type" value={t.value} defaultChecked={i === 0} className="mt-1 accent-radar-purple" />
              <span className="flex flex-col">
                <span className="font-extrabold">{t.label}</span>
                <span className="text-sm text-radar-purple/80">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {e.type && (
          <p id="type-err" className={errorCls}>
            {e.type}
          </p>
        )}
      </fieldset>

      <p className="rounded-button bg-lavender px-3.5 py-2.5 text-sm text-radar-purple">
        Invited by a team? Use the link in your invitation email.
      </p>

      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-2.5 text-[15px] text-radar-purple">
          <input
            type="checkbox"
            name="terms"
            className="mt-1 h-4 w-4 accent-radar-purple"
            aria-invalid={e.terms ? true : undefined}
            aria-describedby={e.terms ? "terms-err" : undefined}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-extrabold underline">
              Terms of use
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="font-extrabold underline">
              Privacy policy
            </Link>
            .
          </span>
        </label>
        {e.terms && (
          <p id="terms-err" className={errorCls}>
            {e.terms}
          </p>
        )}
      </div>

      <FormMessage message={state.message} />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Creating your account…" : "Create free account"}
      </button>
    </form>
  );
}
