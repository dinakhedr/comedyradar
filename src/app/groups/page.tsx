import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GroupsListing, GroupsListingSkeleton } from "@/components/groups/groups-listing";
import { NewsletterBand } from "@/components/newsletter-band";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Comedy groups in Egypt",
  description: "Comedy groups and improv troupes: members, next shows and tours, all on Comedy Radar.",
  alternates: { canonical: "/groups" },
};

/** All groups (docs/website-spec.md, 7.4). */
export default function GroupsPage({ searchParams }: PageProps<"/groups">) {
  return (
    <>
      <SiteHeader />
      <main>
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2 md:pb-4">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Groups</span>
        </nav>
        <Suspense fallback={<GroupsListingSkeleton />}>
          <GroupsListing searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
