import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { StatusPill } from "@/components/status";
import { TourForm } from "@/components/tours/tour-form";
import { requireSuperAdmin } from "@/lib/data/admin";
import { getAdminTourFormOptions } from "@/lib/data/admin-create";
import { getEditableTour } from "@/lib/data/my-tours";

export const metadata: Metadata = { title: "Edit tour" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = { draft: "Draft", pending: "In review", published: "Live", archived: "Archived" } as const;

async function Content({ params, searchParams }: PageProps<"/admin/shows/tours/[id]/edit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  await requireSuperAdmin();
  const [tour, options] = await Promise.all([getEditableTour(id, { anyOwner: true }), getAdminTourFormOptions()]);
  if (!tour) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-heading font-extrabold break-words">{tour.name}</h2>
        <StatusPill status={tour.status} label={STATUS[tour.status]} />
        {tour.status === "published" && (
          <a href={`/tours/${tour.slug}`} target="_blank" rel="noreferrer" className="text-sm font-extrabold underline">
            View the public page
          </a>
        )}
      </div>
      <TourForm {...options} tour={tour} admin focusDates={sp.add === "1"} />
    </>
  );
}

/** Admin > Shows and tours > Tours > "+ Add a date" (?add=1) or "Edit dates, prices and more": edit any tour and add dates. */
export default function AdminEditTourPage({ params, searchParams }: PageProps<"/admin/shows/tours/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/shows?tab=tours" className="text-sm font-extrabold underline">
          Back to Shows and tours
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">EDIT TOUR</h1>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
