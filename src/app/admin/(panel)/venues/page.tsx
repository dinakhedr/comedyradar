import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { StatusLegend, VenueLocations } from "@/components/admin/venue-locations";
import { getAdminSettings, getAdminVenues } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Venues" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Content({ searchParams }: { searchParams: PageProps<"/admin/venues">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const [data, venues] = await Promise.all([getAdminSettings(), getAdminVenues("", "")]);
  const open = /^[A-Z]{2}$/.test(one(sp.open)) ? one(sp.open) : "";
  return (
    <section aria-label="Venues by country and city" className={`${card} flex flex-col gap-4`}>
      <p className="text-sm text-radar-purple/75">
        Open a country to see its cities. Press + beside a city to add a venue there. Countries and cities are added in{" "}
        <Link href="/admin/settings#locations" className="font-extrabold underline">
          Settings
        </Link>
        .
      </p>
      <StatusLegend />
      <p className="text-sm">
        Venues: {data.venues.published} published, {data.venues.pending} waiting.
        {data.venues.pending > 0 && (
          <>
            {" "}
            <Link href="/admin/review" className="font-extrabold underline">
              Review waiting venues
            </Link>
          </>
        )}
      </p>
      <VenueLocations countries={data.countries} venues={venues} open={open} />
    </section>
  );
}

/** Admin Venues: every venue by country and city. Only the super admin adds venues (PR 50). */
export default function AdminVenuesPage({ searchParams }: PageProps<"/admin/venues">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">VENUES</h1>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
