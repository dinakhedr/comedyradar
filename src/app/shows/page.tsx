import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewsletterBand } from "@/components/newsletter-band";
import { ShowsListing, ShowsListingSkeleton } from "@/components/shows/shows-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "All comedy shows in Egypt and on tour",
  description:
    "Every upcoming stand-up comedy show in Egypt, Egyptian comedians on tour and visiting comedians. Filter by date, city and performer.",
  alternates: { canonical: "/shows" },
};

/** All shows (docs/website-spec.md, 7.1). */
export default function ShowsPage({ searchParams }: PageProps<"/shows">) {
  return (
    <>
      <SiteHeader />
      <main>
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2 md:pb-4">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Shows</span>
        </nav>
        <Suspense fallback={<ShowsListingSkeleton />}>
          <ShowsListing searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
