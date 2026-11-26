import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { card } from "@/components/dashboard/ui";
import { CoverImage } from "@/components/placeholder-image";
import { ClaimForm } from "@/components/profiles/claim-form";
import { requireAccount } from "@/lib/data/dashboard";
import { getClaimTarget } from "@/lib/data/profiles";
import { ErrorNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Claim a profile" };

async function Content({ params }: { params: PageProps<"/dashboard/profiles/claim/[kind]/[slug]">["params"] }) {
  const { kind, slug } = await params;
  if (kind !== "comedian" && kind !== "group") notFound();
  const [account, target] = await Promise.all([requireAccount(), getClaimTarget(kind, decodeURIComponent(slug))]);
  if (!target) notFound();

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full md:h-20 md:w-20">
          <CoverImage src={target.photo_url} alt="" iconSize={28} className="h-full w-full" tone="deep" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Claim {kind === "group" ? "a group" : "a comedian"}</p>
          <h1 className="font-display text-[30px] leading-none break-words md:text-[42px]">{target.name.toUpperCase()}</h1>
          <Link href={`/${kind === "group" ? "groups" : "comedians"}/${target.slug}`} className="text-sm font-extrabold underline">
            View the public page
          </Link>
        </div>
      </div>
      {target.has_admin && (
        <p className="rounded-card border-2 border-laugh-pink bg-white px-4 py-3 text-base font-bold">
          Someone already manages this page. If you work with them, ask them to add you in Team and access. Claim it only if
          you think the access is wrong.
        </p>
      )}
      {account.is_suspended ? (
        <ErrorNote stay>This account is suspended. Please contact comedyradarnetwork@gmail.com.</ErrorNote>
      ) : (
        <ClaimForm kind={kind} profileId={target.id} profileName={target.name} email={account.email} />
      )}
    </>
  );
}

/** Claim an existing profile (spec 11.3 and 11.4 item 2). */
export default function ClaimPage({ params }: PageProps<"/dashboard/profiles/claim/[kind]/[slug]">) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/profiles/new" className="text-sm font-extrabold underline">
        Back to search
      </Link>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
