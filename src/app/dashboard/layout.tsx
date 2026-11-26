import type { Metadata } from "next";
import { Suspense } from "react";
import { DashNav } from "@/components/dashboard/dash-nav";
import { RequestsCount, TopBar } from "@/components/dashboard/top-bar";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Comedy Radar dashboard" },
  robots: { index: false, follow: false },
};

/**
 * Creator dashboard (spec 11.4): light working theme, Lavender background,
 * white cards, Radar Purple sidebar. Signed-out visitors are sent to Sign in
 * by the proxy, and every page checks the account again on the server.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-screen bg-lavender text-radar-purple md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 bg-radar-purple text-white">
        <div className="flex min-w-0 flex-col gap-4 px-[18px] pt-3.5 pb-3 md:sticky md:top-0 md:gap-8 md:px-4 md:py-6">
          <Logo className="w-[140px]" />
          <DashNav
            requestsCount={
              <Suspense fallback={null}>
                <RequestsCount />
              </Suspense>
            }
          />
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
