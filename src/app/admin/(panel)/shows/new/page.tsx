import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { ShowForm } from "@/components/shows/show-form";
import { requireSuperAdmin } from "@/lib/data/admin";
import { getAdminShowFormOptions } from "@/lib/data/admin-create";
import { getEditableShow } from "@/lib/data/my-shows";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add new show" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Form({ searchParams }: { searchParams: PageProps<"/admin/shows/new">["searchParams"] }) {
  const sp = await searchParams;
  const from = typeof sp.from === "string" && UUID.test(sp.from) ? sp.from : null;
  if (from) await requireSuperAdmin();
  const [options, copy] = await Promise.all([getAdminShowFormOptions(), from ? getEditableShow(from) : null]);
  // Duplicate: keep the copied show's tour in the menu, even when it is not among the latest tours.
  if (copy?.tour_id && !options.tours.some((t) => t.id === copy.tour_id)) {
    const supabase = await createClient();
    const { data } = await supabase.from("tours").select("id, name, comedian_id, group_id").eq("id", copy.tour_id).maybeSingle();
    if (data) options.tours = [...options.tours, data as (typeof options.tours)[number]];
  }
  return (
    <>
      {copy && (
        <p className="rounded-card bg-white px-4 py-3 font-bold">
          A copy of &ldquo;{copy.title}&rdquo;. Pick the new date and time, change anything else, then save. Nothing is saved until you press Save.
        </p>
      )}
      <ShowForm {...options} copy={copy} admin />
    </>
  );
}

/** Admin > Shows and tours > Add new show: for any comedian or group. With ?from= it starts as a copy (Duplicate icon). */
export default function AdminNewShowPage({ searchParams }: PageProps<"/admin/shows/new">) {
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
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
