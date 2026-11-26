import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TwoStepForm } from "@/components/admin/two-step-form";
import { Logo } from "@/components/logo";
import { requireSuperAdminAccount } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "2-step verification" };

async function Gate() {
  await requireSuperAdminAccount();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === "aal2") redirect("/admin");
  const first = data?.nextLevel !== "aal2";
  return (
    <>
      <h1 className="font-display text-[32px] leading-none md:text-[40px]">{first ? "TURN ON 2-STEP" : "2-STEP CHECK"}</h1>
      <p className="text-[15px] text-radar-purple/80">
        {first
          ? "The admin panel needs a second step after your password: a 6-digit code from an app on your phone. You set it up once."
          : "Type the 6-digit code from your authenticator app to open the admin panel."}
      </p>
      <TwoStepForm />
    </>
  );
}

/** 2-step verification before the admin panel (spec 11.5: super admin and 2-step). */
export default function TwoStepPage() {
  return (
    <div className="min-h-screen bg-stage-black px-[18px] py-8 text-radar-purple">
      <div className="mx-auto flex max-w-[520px] flex-col gap-6">
        <div className="flex items-center gap-3">
          <Logo className="w-[130px]" />
          <span className="rounded-md bg-laugh-pink px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-radar-purple uppercase">Super admin</span>
        </div>
        <section className="flex flex-col gap-4 rounded-card bg-white p-5 md:p-8">
          <Suspense fallback={<p aria-busy="true">Loading…</p>}>
            <Gate />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
