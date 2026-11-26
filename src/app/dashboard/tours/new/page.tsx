import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { card, yellowBtn } from "@/components/dashboard/ui";
import { TourForm } from "@/components/tours/tour-form";
import { requireAccount } from "@/lib/data/dashboard";
import { getTourFormOptions } from "@/lib/data/my-tours";
import { ErrorNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Add a tour" };

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/tours/new">["searchParams"] }) {
  const sp = await searchParams;
  const [account, options] = await Promise.all([requireAccount(), getTourFormOptions()]);
  if (account.is_suspended) {
    return (
      <ErrorNote>This account is suspended. Please contact comedyradarnetwork@gmail.com.</ErrorNote>
    );
  }
  if (!options.profiles.length) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="text-base">To add a tour, first create or claim the comedian or group page that is touring.</p>
        <Link href="/dashboard/profiles/new" className={yellowBtn}>
          Create or claim a profile
        </Link>
      </div>
    );
  }
  const p = typeof sp.p === "string" ? sp.p : undefined;
  const preset = p ? options.profiles.find((x) => `${x.kind === "group" ? "g" : "c"}:${x.slug}` === p) : undefined;
  return <TourForm {...options} defaultPerformer={preset ? `${preset.kind === "group" ? "g" : "c"}:${preset.id}` : undefined} />;
}

/** Add a tour (spec 11.4 item 8). */
export default function NewTourPage({ searchParams }: PageProps<"/dashboard/tours/new">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/dashboard/tours" className="text-sm font-extrabold underline">
          Back to Tours
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">ADD A TOUR</h1>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
