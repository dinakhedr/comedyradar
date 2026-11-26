import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewsletterBand } from "@/components/newsletter-band";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToursListing, ToursListingSkeleton } from "@/components/tours/tours-listing";

export const metadata: Metadata = {
  title: "Comedy tours: Egyptian comedians on tour and visiting acts",
  description:
    "Every comedy tour on the radar: Egyptian comedians and groups on tour abroad, and visiting comedians touring Egypt. Dates, cities and tickets.",
  alternates: { canonical: "/tours" },
};

/** All tours (docs/website-spec.md, 7.2). */
export default function ToursPage({ searchParams }: PageProps<"/tours">) {
  return (
    <>
      <SiteHeader />
      <main>
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2 md:pb-4">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Tours</span>
        </nav>
        <Suspense fallback={<ToursListingSkeleton />}>
          <ToursListing searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
