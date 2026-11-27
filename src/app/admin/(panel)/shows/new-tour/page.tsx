import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { TourForm } from "@/components/tours/tour-form";
import { getAdminTourFormOptions } from "@/lib/data/admin-create";

export const metadata: Metadata = { title: "Add new tour" };

async function Form() {
  const options = await getAdminTourFormOptions();
  return <TourForm {...options} admin />;
}

/** Admin > Shows and tours > Add new tour: for any comedian or group. */
export default function AdminNewTourPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/shows?tab=tours" className="text-sm font-extrabold underline">
          Back to Shows and tours
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">ADD NEW TOUR</h1>
        <p className="text-base text-radar-purple/80">For any comedian or group. Each date becomes a show on the tour.</p>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Form />
      </Suspense>
    </div>
  );
}
