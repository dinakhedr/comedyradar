"use client";

import { useActionState } from "react";
import { confirmClaim, type ConfirmState } from "@/app/actions/profiles";
import { Field, FormMessage, primaryBtn } from "@/components/auth/fields";
import { SuccessNote } from "@/components/status-note";
import { SubmitButton } from "@/components/submit-button";

/** "The comedian confirms": type your name, tap Confirm. */
export function ConfirmForm({ token, claimant, profileName }: { token: string; claimant: string; profileName: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmClaim, {});
  if (state.ok) {
    return (
      <SuccessNote stay>
        Thank you! You confirmed that {claimant} manages {profileName}. Comedy Radar will finish the check.
      </SuccessNote>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage message={state.message} />
      <Field label="Your name" name="name" autoComplete="name" maxLength={80} />
      <SubmitButton type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Confirming…" : "Confirm"}
      </SubmitButton>
    </form>
  );
}
