import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { leavePodcast, removeGroupMember, setArchiveRequest, setProfileStatus } from "@/app/actions/profile-edit";
import { card, outlineBtn, Tag } from "@/components/dashboard/ui";
import { CoverImage } from "@/components/placeholder-image";
import { AddMembersForm, PodcastForm, ProfileEditForm } from "@/components/profiles/edit-forms";
import { profileStatus, ROLE_LABELS } from "@/lib/dashboard";
import { getComedianPodcasts, getEditableProfile, getGroupMembers, type EditableProfile } from "@/lib/data/profile-edit";
import { getCountries } from "@/lib/data/profiles";
import { PODCAST_LINKS } from "@/lib/profile-forms";

export const metadata: Metadata = { title: "Edit profile" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo" });

const LINK_STATUS = { accepted: { label: "Accepted", tone: "yellow" }, pending: { label: "Waiting for answer", tone: "pink" }, declined: { label: "Declined", tone: "outline" } } as const;

function Hidden({ p }: { p: EditableProfile }) {
  return (
    <>
      <input type="hidden" name="kind" value={p.kind} />
      <input type="hidden" name="profile_id" value={p.id} />
    </>
  );
}

function SidePanel({ p }: { p: EditableProfile }) {
  const status = profileStatus(p);
  const admin = p.role === "admin";
  return (
    <aside aria-label="Profile status" className="flex flex-col gap-4">
      <section className={`${card} flex flex-col gap-3`}>
        <h2 className="text-lg font-extrabold">Status</h2>
        <div className="flex flex-wrap gap-2">
          <Tag tone={status.tone}>{status.label}</Tag>
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
            <button className={`${outlineBtn} w-full`}>Send for review</button>
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
                <button className={`${outlineBtn} w-full`}>Cancel the request</button>
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
                <button className={`${outlineBtn} w-full`}>Request archive</button>
              </form>
            </>
          )}
        </section>
      )}
    </aside>
  );
}

async function Members({ p }: { p: EditableProfile }) {
  const members = await getGroupMembers(p.id);
  const admin = p.role === "admin";
  return (
    <section aria-labelledby="members" className={`${card} flex flex-col gap-4`}>
      <h2 id="members" className="text-heading font-extrabold">
        Members
      </h2>
      {members.length === 0 ? (
        <p className="text-base text-radar-purple/80">No members yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const s = LINK_STATUS[m.link_status];
            return (
              <li key={m.comedian_id} className="flex flex-wrap items-center justify-between gap-2 rounded-button bg-lavender px-3 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{m.name}</span>
                  <Tag tone={s.tone}>{s.label}</Tag>
                  {m.status === "draft" && <span className="text-sm">draft page</span>}
                </span>
                {admin && (
                  <form action={removeGroupMember}>
                    <Hidden p={p} />
                    <input type="hidden" name="comedian_id" value={m.comedian_id} />
                    <button className="min-h-11 rounded-button px-3 text-sm font-extrabold underline">
                      Remove<span className="sr-only"> {m.name}</span>
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {admin && <AddMembersForm groupId={p.id} />}
    </section>
  );
}

async function Podcasts({ p }: { p: EditableProfile }) {
  const podcasts = await getComedianPodcasts(p.id);
  const admin = p.role === "admin";
  return (
    <section aria-labelledby="podcasts" className={`${card} flex flex-col gap-4`}>
      <h2 id="podcasts" className="text-heading font-extrabold">
        Podcasts
      </h2>
      {podcasts.length === 0 && <p className="text-base text-radar-purple/80">No podcasts yet.</p>}
      <ul className="flex flex-col gap-3">
        {podcasts.map((pod) => {
          const others = pod.hosts.filter((h) => h.comedian_id !== p.id);
          const listen = PODCAST_LINKS.filter((l) => pod[l.key]).map((l) => l.label);
          return (
            <li key={pod.id} className="flex flex-col gap-3 rounded-card border border-radar-purple/10 p-3">
              <div className="flex items-center gap-3">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  <CoverImage src={pod.cover_url} alt="" iconSize={24} className="h-full w-full" tone="deep" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-extrabold">{pod.name}</span>
                  <span className="text-sm text-radar-purple/80">{listen.length ? `On ${listen.join(", ")}` : "No listen links yet"}</span>
                  {others.length > 0 && (
                    <span className="flex flex-wrap items-center gap-1.5 text-sm">
                      Hosted with
                      {others.map((h) => (
                        <span key={h.comedian_id} className="rounded-full bg-lavender px-2 py-0.5 font-bold">
                          {h.name}
                          {h.link_status === "pending" && " · waiting"}
                          {h.link_status === "declined" && " · declined"}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              {admin && (
                <details className="rounded-button bg-lavender/60 px-3">
                  <summary className="min-h-11 cursor-pointer content-center font-extrabold">Edit {pod.name}</summary>
                  <div className="flex flex-col gap-4 pb-4">
                    <PodcastForm comedianId={p.id} podcast={pod} />
                    <form action={leavePodcast} className="border-t border-radar-purple/10 pt-3">
                      <Hidden p={p} />
                      <input type="hidden" name="podcast_id" value={pod.id} />
                      <button className="min-h-11 text-sm font-extrabold underline">Take {p.name} off this podcast</button>
                    </form>
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>
      {admin && (
        <details className="rounded-card border-2 border-dashed border-radar-purple/30 px-3">
          <summary className="min-h-12 cursor-pointer content-center font-extrabold">+ Add a podcast</summary>
          <div className="pb-4">
            <PodcastForm comedianId={p.id} />
          </div>
        </details>
      )}
    </section>
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
