import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConfirmForm } from "@/components/profiles/confirm-form";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Confirm a manager",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELATION: Record<string, string> = {
  self: "they are the comedian",
  manager: "they are the manager",
  member: "they are a member of the group",
};

type ToConfirm = { profile_name: string; profile_kind: string; claimant_name: string | null; relation: string | null; confirmed: boolean };

async function Content({ params }: { params: PageProps<"/claim/confirm/[token]">["params"] }) {
  const { token } = await params;
  const db = UUID.test(token) ? createPublicClient() : null;
  const { data } = db ? await db.rpc("claim_to_confirm", { p_token: token }) : { data: null };
  const row = ((data ?? []) as ToConfirm[])[0];

  if (!row) {
    return (
      <>
        <h1 className="font-display text-[32px] leading-none md:text-[40px]">LINK NOT VALID</h1>
        <p className="text-base">This link has expired, was already used, or the request was closed. Nothing else is needed from you.</p>
      </>
    );
  }
  const who = row.claimant_name || "Someone";
  const relation = RELATION[row.relation ?? ""] ?? "they manage it";
  return (
    <>
      <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Comedy Radar</p>
      <h1 className="font-display text-[32px] leading-none md:text-[40px]">CONFIRM A MANAGER</h1>
      {row.confirmed ? (
        <p role="status" className="rounded-button bg-lavender px-4 py-3 text-base font-extrabold">
          This request is already confirmed. Thank you!
        </p>
      ) : (
        <>
          <p className="text-base">
            <strong>{who}</strong> asked to manage the Comedy Radar page of <strong>{row.profile_name}</strong> and says
            {" "}{relation}.
          </p>
          <p className="text-base">
            If this is right, type your name and tap Confirm. If you don&apos;t know this person, just close this page; Comedy
            Radar also checks every request.
          </p>
          <ConfirmForm token={token} claimant={who} profileName={row.profile_name} />
        </>
      )}
    </>
  );
}

/** "The comedian or a group member confirms" (spec 11.3, proof 2). No account needed. */
export default function ConfirmClaimPage({ params }: PageProps<"/claim/confirm/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-col px-[18px] pt-4 pb-14 md:pt-10">
        <div className="flex flex-col gap-4 rounded-card bg-white p-5 text-radar-purple md:p-8">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-lavender" />}>
            <Content params={params} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
