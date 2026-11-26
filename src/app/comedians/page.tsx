import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ComediansListing, ComediansListingSkeleton } from "@/components/comedians/comedians-listing";
import { NewsletterBand } from "@/components/newsletter-band";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Stand-up comedians in Egypt",
  description: "Every comedian on Comedy Radar: upcoming shows, tours, podcasts and the groups they perform with.",
  alternates: { canonical: "/comedians" },
};

/** All comedians (docs/website-spec.md, 7.3). */
export default function ComediansPage({ searchParams }: PageProps<"/comedians">) {
  return (
    <>
      <SiteHeader />
      <main>
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2 md:pb-4">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Comedians</span>
        </nav>
        <Suspense fallback={<ComediansListingSkeleton />}>
          <ComediansListing searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
