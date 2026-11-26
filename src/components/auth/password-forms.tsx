"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type AuthState } from "@/app/actions/auth";
import { Field, FormMessage, PasswordField, primaryBtn } from "./fields";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  if (state.ok) {
    return (
      <p role="status" className="text-base text-radar-purple">
        If <strong>{state.email}</strong> has an account, we sent it a link to choose a new password. The link works
        for one hour.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" error={state.errors?.email} maxLength={254} />
      <FormMessage message={state.message} />
      <SubmitButton type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Sending…" : "Send reset link"}
      </SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <PasswordField label="New password" name="password" autoComplete="new-password" error={e.password} meter />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" error={e.confirm} />
      <FormMessage message={state.message} />
      <SubmitButton type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Saving…" : "Save new password"}
      </SubmitButton>
    </form>
  );
}
