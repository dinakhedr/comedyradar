import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { ShowForm } from "@/components/shows/show-form";
import { getAdminShowFormOptions } from "@/lib/data/admin-create";

export const metadata: Metadata = { title: "Add new show" };

async function Form() {
  const options = await getAdminShowFormOptions();
  return <ShowForm {...options} admin />;
}

/** Admin > Shows and tours > Add new show: for any comedian or group. */
export default function AdminNewShowPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/shows" className="text-sm font-extrabold underline">
          Back to Shows and tours
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">ADD NEW SHOW</h1>
        <p className="text-base text-radar-purple/80">For any comedian or group. You do not become an admin of the profile.</p>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Form />
      </Suspense>
    </div>
  );
}
