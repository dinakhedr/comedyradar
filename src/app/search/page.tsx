import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewsletterBand } from "@/components/newsletter-band";
import { SearchResults, SearchResultsSkeleton } from "@/components/search/search-results";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { normalizeQuery } from "@/lib/search";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = normalizeQuery((await searchParams).q);
  return {
    title: q ? `Search: "${q}"` : "Search",
    // Search result pages change all the time, so search engines should skip them.
    robots: { index: false, follow: true },
  };
}

/** Search results (docs/website-spec.md, section 8). */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <SiteHeader />
      <main>
        <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-[18px] pt-1 pb-3 text-small text-lavender-text md:px-8 md:pt-2">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Search</span>
        </nav>
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}
