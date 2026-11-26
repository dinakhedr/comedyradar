import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewsletterBand } from "@/components/newsletter-band";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VenuesListing, VenuesListingSkeleton } from "@/components/venues/venues-listing";

export const metadata: Metadata = {
  title: "Comedy venues in Egypt",
  description: "Where stand-up comedy happens: venues, their areas and their upcoming shows, all on Comedy Radar.",
  alternates: { canonical: "/venues" },
};

/** All published venues, with a city filter (spec section 4, /venues). */
export default function VenuesPage({ searchParams }: PageProps<"/venues">) {
  return (
    <>
      <SiteHeader />
      <main>
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2 md:pb-4">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Venues</span>
        </nav>
        <Suspense fallback={<VenuesListingSkeleton />}>
          <VenuesListing searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
