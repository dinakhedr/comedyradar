import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/** Opened from the reset link in the email (via /auth/confirm, which signs the user in). */
export default function ResetPasswordPage() {
  return (
    <AuthShell tab={null}>
      <h2 className="font-display text-[28px] leading-none md:text-[32px]">CHOOSE A NEW PASSWORD</h2>
      <NewPasswordForm />
    </AuthShell>
  );
}
