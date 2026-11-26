import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { setArchiveRequest, setProfileStatus } from "@/app/actions/profile-edit";
import { card, outlineBtn, Tag } from "@/components/dashboard/ui";
import { ProfileEditForm } from "@/components/profiles/edit-forms";
import { Hidden, Members, Podcasts } from "@/components/profiles/edit-sections";
import { profileStatus, ROLE_LABELS } from "@/lib/dashboard";
import { getEditableProfile, type EditableProfile } from "@/lib/data/profile-edit";
import { getCountries } from "@/lib/data/profiles";
import { StatusPill } from "@/components/status";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Edit profile" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo" });

function SidePanel({ p }: { p: EditableProfile }) {
  const status = profileStatus(p);
  const admin = p.role === "admin";
  return (
    <aside aria-label="Profile status" className="flex flex-col gap-4">
      <section className={`${card} flex flex-col gap-3`}>
        <h2 className="text-lg font-extrabold">Status</h2>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={status.kind} label={status.label} />
          {!p.verified && <Tag tone="outline">Not verified</Tag>}
          {p.verified && p.status !== "published" && <Tag tone="purple">Verified</Tag>}
        </div>
        <p className="text-sm text-radar-purple/80">
          {p.status === "draft"
            ? "Only your team can see this draft."
            : p.status === "pending"
              ? "Comedy Radar is reviewing this profile."
              : p.status === "published"
                ? "Your page is live."
                : "This profile is archived."}
        </p>
        {admin && p.status === "draft" && (
          <form action={setProfileStatus}>
            <Hidden p={p} />
            <input type="hidden" name="to" value="pending" />
            <SubmitButton className={`${outlineBtn} w-full`}>Send for review</SubmitButton>
          </form>
        )}
        {p.status === "published" && (
          <Link href={`/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}`} className="text-sm font-extrabold underline">
            View the public page
          </Link>
        )}
        {p.pendingName && (
          <p className="rounded-button bg-lavender px-3 py-2 text-sm">
            New name waiting for review: <strong>{p.pendingName.name}</strong>
            {p.pendingName.name_ar && (
              <span lang="ar" dir="rtl">
                {" "}
                · {p.pendingName.name_ar}
              </span>
            )}
          </p>
        )}
        <p className="text-sm text-radar-purple/80">
          {p.panel.last_edit_at
            ? `Last edit: ${when(p.panel.last_edit_at)}${p.panel.last_edit_by ? ` by ${p.panel.last_edit_by}` : ""}`
            : "No edits yet."}
        </p>
      </section>

      <section className={`${card} flex flex-col gap-3`}>
        <h2 className="text-lg font-extrabold">People with access</h2>
        <ul className="flex flex-col gap-2">
          {p.panel.people.map((person, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-bold">
                {person.name}
                {person.me && " (you)"}
              </span>
              <Tag tone={person.role === "admin" ? "yellow" : "outline"}>{ROLE_LABELS[person.role]}</Tag>
            </li>
          ))}
        </ul>
        <p className="text-sm text-radar-purple/75">You will be able to invite people from Team and access soon.</p>
      </section>

      {admin && p.status !== "archived" && (
        <section className={`${card} flex flex-col gap-3`}>
          <h2 className="text-lg font-extrabold">Archive</h2>
          {p.archive_requested_at ? (
            <>
              <p className="text-sm">You asked to archive this profile on {when(p.archive_requested_at)}. Comedy Radar will take care of it.</p>
              <form action={setArchiveRequest}>
                <Hidden p={p} />
                <SubmitButton className={`${outlineBtn} w-full`}>Cancel the request</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-radar-purple/80">
                Archiving hides the page from Comedy Radar. Only Comedy Radar can archive or delete a profile.
              </p>
              <form action={setArchiveRequest}>
                <Hidden p={p} />
                <input type="hidden" name="request" value="on" />
                <SubmitButton className={`${outlineBtn} w-full`}>Request archive</SubmitButton>
              </form>
            </>
          )}
        </section>
      )}
    </aside>
  );
}

async function Content({ params, searchParams }: { params: PageProps<"/dashboard/p/[slug]/edit">["params"]; searchParams: PageProps<"/dashboard/p/[slug]/edit">["searchParams"] }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const p = await getEditableProfile(decodeURIComponent(slug), typeof sp.type === "string" ? sp.type : undefined);
  if (!p) notFound();
  const countries = p.role === "admin" ? await getCountries() : [];

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href="/dashboard/profiles" className="text-sm font-extrabold underline">
          Back to Profiles
        </Link>
        <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Edit {p.kind === "group" ? "group" : "comedian"}</p>
        <h1 className="font-display text-[32px] leading-none break-words md:text-[44px]">{p.name.toUpperCase()}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {p.role === "admin" ? (
            <ProfileEditForm p={p} countries={countries} />
          ) : (
            <p className="rounded-card border-2 border-laugh-pink bg-white px-4 py-3 font-bold">
              You are a moderator of this profile. Only its admins can change these details.
            </p>
          )}
          {p.kind === "group" ? <Members p={p} /> : <Podcasts p={p} />}
        </div>
        <SidePanel p={p} />
      </div>
    </>
  );
}

/** Edit profile (spec 11.4 item 5). */
export default function EditProfilePage({ params, searchParams }: PageProps<"/dashboard/p/[slug]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} />}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
