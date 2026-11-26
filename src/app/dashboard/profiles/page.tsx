import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { card, ProfileCard, Tag, yellowBtn, type Tone } from "@/components/dashboard/ui";
import { CopyLink } from "@/components/profiles/claim-form";
import { getMyProfiles } from "@/lib/data/dashboard";
import { getMyClaims, type MyClaim } from "@/lib/data/profiles";
import { PROOF_METHODS } from "@/lib/profile-forms";

export const metadata: Metadata = { title: "Profiles" };

const CLAIM_STATUS: Record<MyClaim["status"], { label: string; tone: Tone }> = {
  pending: { label: "Waiting for review", tone: "pink" },
  approved: { label: "Approved", tone: "yellow" },
  rejected: { label: "Not approved", tone: "outline" },
  expired: { label: "Expired", tone: "outline" },
};

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function Claim({ c, origin }: { c: MyClaim; origin: string }) {
  const status = CLAIM_STATUS[c.status];
  const method = PROOF_METHODS.find((m) => m.value === c.proof_method)?.label ?? c.proof_method;
  const waitingLink = c.status === "pending" && c.proof_method === "comedian_confirms" && c.confirm_token;
  return (
    <li className="flex flex-col gap-2 rounded-card border border-radar-purple/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold">{c.profile_name}</span>
        <span className="text-sm text-radar-purple/75">{c.kind === "group" ? "Group" : "Comedian"}</span>
        <Tag tone={status.tone}>{status.label}</Tag>
      </div>
      <p className="text-sm text-radar-purple/80">
        Proof: {method}
        {c.proof_method === "official_dm" && c.proof_value ? ` from @${c.proof_value}` : ""}
        {c.proof_method === "comedian_confirms" && c.status === "pending" ? (c.confirmed ? " · confirmed" : " · not confirmed yet") : ""}
        {" · "}
        sent {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" })}
      </p>
      {c.decision_reason &&
        (c.status === "pending" ? (
          <p className="rounded-button border-2 border-laugh-pink px-3 py-2 text-sm font-bold">Comedy Radar needs more proof: {c.decision_reason}</p>
        ) : (
          <p className="text-sm">{c.decision_reason}</p>
        ))}
      {waitingLink && !c.confirmed && <CopyLink url={`${origin}/claim/confirm/${c.confirm_token}`} label="Private confirmation link to send" />}
    </li>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/profiles">["searchParams"] }) {
  const sp = await searchParams;
  const [profiles, claims, origin] = await Promise.all([getMyProfiles(), getMyClaims(), siteOrigin()]);
  const created = typeof sp.created === "string" ? sp.created : null;

  return (
    <>
      {created && (
        <p role="status" className="rounded-card bg-spotlight-yellow px-4 py-3 font-extrabold">
          Your profile is saved. Comedy Radar will review it before it goes live; drafts stay private until you send them.
        </p>
      )}
      <section aria-labelledby="mine" className={`${card} flex flex-col gap-4`}>
        <h2 id="mine" className="text-heading font-extrabold">
          My profiles
        </h2>
        {profiles.length === 0 ? (
          <p className="text-base text-radar-purple/80">You don&apos;t manage any profile yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {profiles.map((p) => (
              <ProfileCard key={`${p.kind}-${p.id}`} p={p} />
            ))}
          </ul>
        )}
      </section>
      {claims.length > 0 && (
        <section aria-labelledby="claims" className={`${card} flex flex-col gap-4`}>
          <h2 id="claims" className="text-heading font-extrabold">
            My claims
          </h2>
          <ul className="flex flex-col gap-3">
            {claims.map((c) => (
              <Claim key={c.id} c={c} origin={origin} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Profiles the account manages and its claims (spec 11.4). */
export default function ProfilesPage({ searchParams }: PageProps<"/dashboard/profiles">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[36px] leading-none md:text-[48px]">PROFILES</h1>
        <Link href="/dashboard/profiles/new" className={yellowBtn}>
          Create or claim a profile
        </Link>
      </div>
      <Suspense fallback={<div className={`${card} h-48 animate-pulse`} />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
