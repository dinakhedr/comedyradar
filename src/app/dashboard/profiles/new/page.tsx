import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { inputCls, labelCls } from "@/components/auth/fields";
import { card, outlineBtn, Tag, yellowBtn } from "@/components/dashboard/ui";
import { CoverImage } from "@/components/placeholder-image";
import { findProfiles, type FoundProfile } from "@/app/actions/profiles";

export const metadata: Metadata = { title: "Create or claim a profile" };

function Result({ p }: { p: FoundProfile }) {
  const kindLabel = p.kind === "group" ? "Group" : "Comedian";
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-radar-purple/10 bg-white p-3">
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
        <CoverImage src={p.photo_url} alt="" iconSize={24} className="h-full w-full" tone="deep" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-extrabold">
          {p.name}
          {p.name_ar && (
            <span lang="ar" dir="rtl" className="ml-2 font-bold text-radar-purple/75">
              {p.name_ar}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-2 text-sm text-radar-purple/75">
          {kindLabel}
          {p.status === "pending" && <Tag tone="pink">In review</Tag>}
          {p.status === "published" && p.has_admin && <Tag tone="outline">Has an admin</Tag>}
        </span>
        {p.status === "published" && p.has_admin && (
          <span className="text-sm text-radar-purple/80">
            Someone already manages this page. If you work with them, ask them to add you in Team and access. If you think
            it&apos;s wrong, you can still claim it.
          </span>
        )}
        {p.status === "pending" && (
          <span className="text-sm text-radar-purple/80">Someone created this profile and it is waiting for review.</span>
        )}
      </span>
      {p.status === "published" && p.slug && (
        <Link href={`/dashboard/profiles/claim/${p.kind}/${p.slug}`} className={yellowBtn}>
          Claim<span className="sr-only"> {p.name}</span>
        </Link>
      )}
    </li>
  );
}

function CreateChoice({ found }: { found: boolean }) {
  return (
    <section aria-labelledby="create" className={`${card} flex flex-col gap-3`}>
      <h2 id="create" className="text-heading font-extrabold">
        {found ? "Not in the list? Create a new profile" : "Create a new profile"}
      </h2>
      <p className="text-base text-radar-purple/80">New profiles are checked by Comedy Radar before they go live.</p>
      <div className="flex flex-wrap gap-2.5">
        <Link href="/dashboard/profiles/new/comedian" className={outlineBtn}>
          A comedian
        </Link>
        <Link href="/dashboard/profiles/new/group" className={outlineBtn}>
          A group
        </Link>
      </div>
    </section>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/dashboard/profiles/new">["searchParams"] }) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const results = q ? await findProfiles(q) : [];
  const tooShort = q.length > 0 && q.replace(/\s+/g, "").length < 2;

  return (
    <>
      <section aria-labelledby="search" className={`${card} flex flex-col gap-4`}>
        <h2 id="search" className="text-heading font-extrabold">
          Is your profile already on Comedy Radar?
        </h2>
        <form action="/dashboard/profiles/new" className="flex flex-col gap-1.5">
          <label htmlFor="q" className={labelCls}>
            Comedian or group name, in English or Arabic
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input id="q" name="q" type="search" defaultValue={q} maxLength={80} required minLength={2} className={inputCls} />
            <button type="submit" className={`${yellowBtn} min-h-12 shrink-0 px-6`}>
              Search
            </button>
          </div>
        </form>
        {q && !tooShort && (
          <div aria-live="polite" className="flex flex-col gap-3">
            {results.length === 0 ? (
              <p className="text-base font-bold">No profile matches &ldquo;{q}&rdquo;. You can create it below.</p>
            ) : (
              <>
                <p className="text-base font-bold">
                  {results.length === 1 ? "1 profile" : `${results.length} profiles`} match &ldquo;{q}&rdquo;
                </p>
                <ul className="flex flex-col gap-3">
                  {results.map((p) => (
                    <Result key={p.id} p={p} />
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
      {q && !tooShort && <CreateChoice found={results.length > 0} />}
      {!q && <p className="text-base text-radar-purple/80">Search first, so the same comedian or group isn&apos;t listed twice.</p>}
    </>
  );
}

/** Create or claim a profile, step 1 (spec 11.4 item 2). */
export default function NewProfilePage({ searchParams }: PageProps<"/dashboard/profiles/new">) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/dashboard/profiles" className="text-sm font-extrabold underline">
          Back to Profiles
        </Link>
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">CREATE OR CLAIM A PROFILE</h1>
      </div>
      <Suspense fallback={<div className={`${card} h-40 animate-pulse`} />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
