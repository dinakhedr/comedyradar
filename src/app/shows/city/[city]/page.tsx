import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NewsletterBand } from "@/components/newsletter-band";
import { findCity, ShowsListing, ShowsListingSkeleton } from "@/components/shows/shows-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export async function generateMetadata({ params }: PageProps<"/shows/city/[city]">): Promise<Metadata> {
  const city = await findCity((await params).city);
  if (!city) return { title: "City not found" };
  return {
    title: `Comedy shows in ${city.name}`,
    description: `Every upcoming stand-up comedy show in ${city.name}: dates, venues and tickets.`,
    alternates: { canonical: `/shows/city/${city.slug}` },
  };
}

/** Shows in one city: the All shows page with the city filter preset (spec 7.1). */
export default function CityShowsPage({ params, searchParams }: PageProps<"/shows/city/[city]">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense fallback={<ShowsListingSkeleton />}>
          <CityShows params={params} searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}

async function CityShows({ params, searchParams }: Pick<PageProps<"/shows/city/[city]">, "params" | "searchParams">) {
  const city = await findCity((await params).city);
  if (!city) notFound();
  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2 md:pb-4">
        <Link href="/" className="hover:text-white">
          Home
        </Link>{" "}
        <span aria-hidden="true">›</span>{" "}
        <Link href="/shows" className="hover:text-white">
          Shows
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="font-bold text-white">{city.name}</span>
      </nav>
      <ShowsListing searchParams={searchParams} city={city} />
    </>
  );
}
