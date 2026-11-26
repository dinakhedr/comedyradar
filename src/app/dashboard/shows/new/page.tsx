import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { card, yellowBtn } from "@/components/dashboard/ui";
import { ShowForm } from "@/components/shows/show-form";
import { requireAccount } from "@/lib/data/dashboard";
import { getEditableShow, getShowFormOptions } from "@/lib/data/my-shows";
import { ErrorNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Add a show" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/shows/new">["searchParams"] }) {
  const sp = await searchParams;
  const from = typeof sp.from === "string" && UUID.test(sp.from) ? sp.from : null;
  const [account, options, copy] = await Promise.all([requireAccount(), getShowFormOptions(), from ? getEditableShow(from) : null]);
  if (account.is_suspended) {
    return (
      <ErrorNote>This account is suspended. Please contact comedyradarnetwork@gmail.com.</ErrorNote>
    );
  }
  if (!options.profiles.length) {
    return (
      <div className={`${card} flex flex-col items-start gap-3`}>
        <p className="text-base">To add a show, first create or claim the comedian or group page that performs it.</p>
        <Link href="/dashboard/profiles/new" className={yellowBtn}>
          Create or claim a profile
        </Link>
      </div>
    );
  }
  const p = typeof sp.p === "string" ? sp.p : undefined;
  const preset = p ? options.profiles.find((x) => `${x.kind === "group" ? "g" : "c"}:${x.slug}` === p) : undefined;
  return (
    <>
      {copy && <p className="rounded-card bg-white px-4 py-3 font-bold">Copied from &ldquo;{copy.title}&rdquo;. Pick the new date and time.</p>}
      <ShowForm {...options} copy={copy} defaultPerformer={preset ? `${preset.kind === "group" ? "g" : "c"}:${preset.id}` : undefined} />
    </>
  );
}

/** Add a show (spec 11.4 item 4). */
export default function NewShowPage({ searchParams }: PageProps<"/dashboard/shows/new">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/dashboard/shows" className="text-sm font-extrabold underline">
          Back to Shows
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">ADD A SHOW</h1>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
