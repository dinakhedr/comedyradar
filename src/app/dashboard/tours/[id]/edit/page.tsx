import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card, Tag } from "@/components/dashboard/ui";
import { TourForm } from "@/components/tours/tour-form";
import { requireAccount } from "@/lib/data/dashboard";
import { getEditableTour, getTourFormOptions } from "@/lib/data/my-tours";

export const metadata: Metadata = { title: "Edit tour" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = { draft: "Draft", pending: "In review", published: "Live", archived: "Archived" } as const;

async function Content({ params, searchParams }: PageProps<"/dashboard/tours/[id]/edit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const [account, options, tour] = await Promise.all([requireAccount(), getTourFormOptions(), getEditableTour(id)]);
  if (!tour) notFound();
  if (account.is_suspended) {
    return (
      <p role="alert" className="rounded-card bg-laugh-pink px-4 py-3 font-extrabold">
        This account is suspended. Please contact comedyradarnetwork@gmail.com.
      </p>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">{tour.name.toUpperCase()}</h1>
        <Tag tone={tour.status === "published" ? "yellow" : tour.status === "pending" ? "pink" : "outline"}>{STATUS[tour.status]}</Tag>
        {tour.status === "published" && (
          <Link href={`/tours/${tour.slug}`} className="text-sm font-extrabold underline">
            View public page
          </Link>
        )}
      </div>
      <TourForm {...options} tour={tour} focusDates={sp.add === "1"} />
    </>
  );
}

/** Edit a tour and add dates (spec 11.4 items 8 and 10). */
export default function EditTourPage(props: PageProps<"/dashboard/tours/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/tours" className="text-sm font-extrabold underline">
        Back to Tours
      </Link>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}
