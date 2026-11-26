import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Comedy Radar dashboard.",
  robots: { index: false },
};

const NOTICES: Record<string, string> = {
  link: "That link has expired or was already used. Please sign in, or ask for a new link.",
  signin: "Please sign in to continue.",
};

async function SignInContent({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(first(sp.next));
  const notice = NOTICES[first(sp.error) ?? ""];
  // Already signed in: the header's "Sign in" button leads straight to the dashboard.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data } = await (await createClient()).auth.getClaims();
    if (data?.claims) redirect(next);
  }
  return (
    <AuthShell tab="signin" next={next}>
      <h2 className="font-display text-[28px] leading-none md:text-[32px]">WELCOME BACK</h2>
      <SignInForm next={next} notice={notice} />
    </AuthShell>
  );
}

/** Sign in (spec 11.4 item 1). */
export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <Suspense fallback={<AuthShell tab="signin"><div className="h-72" /></AuthShell>}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}
