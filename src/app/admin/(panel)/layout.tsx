import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";
import { requireSuperAdmin } from "@/lib/data/admin";
import { SubmitButton } from "@/components/submit-button";

async function TopBar() {
  const account = await requireSuperAdmin();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="rounded-md bg-stage-black px-2.5 py-1 text-xs font-extrabold tracking-wider text-white uppercase">Admin panel</span>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm sm:inline">
          Signed in as <strong>{account.display_name || account.email}</strong>
        </span>
        <Link href="/dashboard" className="min-h-11 content-center rounded-button px-3 text-sm font-extrabold underline">
          Creator dashboard
        </Link>
        <form action={signOut}>
          <SubmitButton type="submit" className="min-h-11 rounded-button border-2 border-stage-black/20 bg-white px-4 text-sm font-extrabold hover:border-stage-black">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

/**
 * Super admin panel (spec 11.5): Stage Black sidebar with a pink SUPER ADMIN
 * label, so it never looks like the creator dashboard. Only a super admin
 * with 2-step verification gets in; everyone else sees "page not found".
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lavender text-radar-purple md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 bg-stage-black text-white">
        <div className="flex min-w-0 flex-col gap-4 px-[18px] pt-3.5 pb-3 md:sticky md:top-0 md:gap-6 md:px-4 md:py-6">
          <div className="flex flex-col items-start gap-2">
            <Logo className="w-[140px]" />
            <span className="rounded-md bg-laugh-pink px-2 py-0.5 text-[11px] font-extrabold tracking-wider text-stage-black uppercase">Super admin</span>
          </div>
          <Suspense fallback={<div className="h-11" />}>
            <AdminNav />
          </Suspense>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="border-b border-radar-purple/10 bg-white px-[18px] py-3 md:px-8">
          <Suspense fallback={<div className="h-11" />}>
            <TopBar />
          </Suspense>
        </header>
        <main className="flex-1 px-[18px] py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
