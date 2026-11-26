import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell tab={null}>
      <h2 className="font-display text-[28px] leading-none md:text-[32px]">FORGOT YOUR PASSWORD?</h2>
      <p className="text-base">Enter your email and we will send you a link to choose a new one.</p>
      <ForgotPasswordForm />
      <Link href="/signin" className="text-sm font-extrabold underline">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
