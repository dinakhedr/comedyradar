import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateShowStatus } from "@/app/actions/shows";
import { card, outlineBtn, Tag } from "@/components/dashboard/ui";
import { ShowForm } from "@/components/shows/show-form";
import { SHOW_STATUS_LABELS } from "@/lib/dashboard";
import { getEditableShow, getShowFormOptions } from "@/lib/data/my-shows";

export const metadata: Metadata = { title: "Edit show" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params }: { params: PageProps<"/dashboard/shows/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [show, options] = await Promise.all([getEditableShow(id), getShowFormOptions()]);
  if (!show) notFound();
  const live = show.status === "published" || show.status === "sold_out";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={show.status === "pending" ? "pink" : live ? "yellow" : "outline"}>{SHOW_STATUS_LABELS[show.status]}</Tag>
        {show.signal !== "none" && <Tag tone="outline">{show.signal} signal</Tag>}
        {show.signal_request && <span className="text-sm">You asked for a {show.signal_request} signal.</span>}
        {live && (
          <Link href={`/shows/${show.slug}`} className="text-sm font-extrabold underline">
            View the public page
          </Link>
        )}
      </div>
      {show.status === "cancelled" ? (
        <p className="rounded-card bg-white px-4 py-3 font-bold">This show is cancelled. Its page tells visitors so.</p>
      ) : (
        <>
          <ShowForm {...options} show={show} />
          <section className={`${card} flex flex-col items-start gap-3`}>
            <h2 className="text-lg font-extrabold">Cancel this show</h2>
            <p className="text-sm text-radar-purple/80">The show leaves the listings and its page says CANCELLED. This can&apos;t be undone here.</p>
            <form action={updateShowStatus}>
              <input type="hidden" name="action" value="cancel" />
              <input type="hidden" name="show_ids" value={show.id} />
              <button className={outlineBtn}>Cancel the show</button>
            </form>
          </section>
        </>
      )}
    </>
  );
}

/** Edit a show (spec 11.4 items 4 and 9). */
export default function EditShowPage({ params }: PageProps<"/dashboard/shows/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/dashboard/shows" className="text-sm font-extrabold underline">
          Back to Shows
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">EDIT SHOW</h1>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
