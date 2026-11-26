import type { Metadata } from "next";
import { RecoveryLanding } from "@/components/auth/recovery-landing";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

/** Where a password reset link sent by Comedy Radar lands (the sign-in details come after # in the address). */
export default function RecoveryPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-radar-purple px-4 text-white">
      <RecoveryLanding />
    </main>
  );
}
