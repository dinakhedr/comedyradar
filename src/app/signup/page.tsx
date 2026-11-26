import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create a free account",
  description: "Comedians, groups and managers: list your shows on Comedy Radar for free.",
  alternates: { canonical: "/for-comedians" },
};

/** Sign up (spec 11.4 item 1). */
export default function SignUpPage() {
  return (
    <AuthShell tab="signup">
      <h2 className="font-display text-[28px] leading-none md:text-[32px]">CREATE YOUR FREE ACCOUNT</h2>
      <SignUpForm />
    </AuthShell>
  );
}
