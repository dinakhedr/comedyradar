import { Suspense } from "react";
import { ComediansToTrack } from "@/components/home/comedians-to-track";
import { ComingUp, ComingUpSkeleton } from "@/components/home/coming-up";
import { Hero } from "@/components/home/hero";
import { OnTour } from "@/components/home/on-tour";
import { SpotlightSection } from "@/components/home/spotlight-section";
import { NewsletterBand } from "@/components/newsletter-band";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Homepage v2 (docs/website-spec.md, section 5). */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero searchParams={searchParams} />
        <SpotlightSection />
        <Suspense fallback={<ComingUpSkeleton />}>
          <ComingUp searchParams={searchParams} />
        </Suspense>
        <OnTour />
        <ComediansToTrack />
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
