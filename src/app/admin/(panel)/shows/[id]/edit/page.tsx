import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { ShowForm } from "@/components/shows/show-form";
import { ShowStatusPill } from "@/components/status";
import { SHOW_STATUS_LABELS } from "@/lib/dashboard";
import { requireSuperAdmin } from "@/lib/data/admin";
import { getAdminShowFormOptions } from "@/lib/data/admin-create";
import { getEditableShow } from "@/lib/data/my-shows";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit show" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params }: { params: PageProps<"/admin/shows/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireSuperAdmin();
  const [show, options] = await Promise.all([getEditableShow(id), getAdminShowFormOptions()]);
  if (!show) notFound();
  // Keep the show's own tour in the menu, even when it is not among the latest tours.
  if (show.tour_id && !options.tours.some((t) => t.id === show.tour_id)) {
    const supabase = await createClient();
    const { data } = await supabase.from("tours").select("id, name, comedian_id, group_id").eq("id", show.tour_id).maybeSingle();
    if (data) options.tours = [...options.tours, data as (typeof options.tours)[number]];
  }
  const live = show.status === "published" || show.status === "sold_out";
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <ShowStatusPill status={show.status} label={SHOW_STATUS_LABELS[show.status]} />
        {live && (
          <a href={`/shows/${show.slug}`} target="_blank" rel="noreferrer" className="text-sm font-extrabold underline">
            View the public page
          </a>
        )}
      </div>
      <ShowForm {...options} show={show} admin />
    </>
  );
}

/** Admin > Shows and tours > pencil: edit every detail of any show, in the same form as Add new show. */
export default function AdminEditShowPage({ params }: PageProps<"/admin/shows/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/shows" className="text-sm font-extrabold underline">
          Back to Shows and tours
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">EDIT SHOW</h1>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
