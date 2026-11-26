import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CoverImage } from "@/components/placeholder-image";
import { firstName, pickProfile, profileStatus, ROLE_LABELS, SHOW_STATUS_LABELS, type ManagedProfile } from "@/lib/dashboard";
import { formatShowDate } from "@/lib/dates";
import { countIncomingRequests, getMyProfiles, getOverview, requireAccount, type DashboardShow } from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Overview" };

const card = "rounded-card bg-white p-4 md:p-6";
const tones = {
  pink: "bg-laugh-pink text-radar-purple",
  yellow: "bg-spotlight-yellow text-radar-purple",
  purple: "bg-radar-purple text-white",
  outline: "border border-radar-purple/30 text-radar-purple",
};

function Tag({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider uppercase ${tones[tone]}`}>{children}</span>;
}

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className={`${card} flex flex-col gap-1`}>
      <span className="text-sm font-bold text-radar-purple/75">{label}</span>
      <span className="font-display text-[34px] leading-none md:text-[40px]">{value.toLocaleString("en")}</span>
      {note && <span className="text-xs text-radar-purple/70">{note}</span>}
    </div>
  );
}

function ProfileCard({ p }: { p: ManagedProfile }) {
  const status = profileStatus(p);
  const href = p.status === "published" ? `/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}` : null;
  return (
    <li className="flex items-center gap-3 rounded-card border border-radar-purple/10 bg-white p-3">
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
        <CoverImage src={p.photo_url} alt="" iconSize={24} className="h-full w-full" tone="deep" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-extrabold">{p.name}</span>
        <span className="text-sm text-radar-purple/75">
          {p.kind === "group" ? "Group" : "Comedian"} · {ROLE_LABELS[p.role]}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Tag tone={status.tone}>{status.label}</Tag>
          {href && (
            <Link href={href} className="text-sm font-extrabold underline">
              View page
            </Link>
          )}
        </span>
      </span>
    </li>
  );
}

function ShowsTable({ shows }: { shows: DashboardShow[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-radar-purple/75">
          <tr className="border-b border-radar-purple/10">
            <th scope="col" className="py-2 pr-3 font-bold">Date</th>
            <th scope="col" className="py-2 pr-3 font-bold">Show</th>
            <th scope="col" className="py-2 pr-3 font-bold">Performer</th>
            <th scope="col" className="py-2 pr-3 font-bold">Status</th>
            <th scope="col" className="py-2 pr-3 text-right font-bold">Ticket clicks</th>
            <th scope="col" className="py-2 font-bold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {shows.map((s) => {
            const live = s.status === "published" || s.status === "sold_out";
            return (
              <tr key={s.id} className="border-b border-radar-purple/10 last:border-0">
                <td className="py-3 pr-3 font-bold whitespace-nowrap">{formatShowDate(new Date(s.starts_at))}</td>
                <td className="py-3 pr-3">
                  <span className="font-extrabold">{s.title}</span>
                  <span className="block text-radar-purple/70">{[s.venue_name, s.city_name].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="py-3 pr-3">{s.performers.join(", ") || "—"}</td>
                <td className="py-3 pr-3">
                  <Tag tone={s.status === "pending" ? "pink" : live ? "yellow" : "outline"}>{SHOW_STATUS_LABELS[s.status] ?? s.status}</Tag>
                </td>
                <td className="py-3 pr-3 text-right font-bold">{s.clicks}</td>
                <td className="py-3 text-right whitespace-nowrap">
                  {live && (
                    <Link href={`/shows/${s.slug}`} className="font-extrabold underline">
                      View page
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SoonButton({ children }: { children: React.ReactNode }) {
  return (
    <span aria-disabled="true" className="inline-flex min-h-11 items-center gap-2 rounded-button bg-spotlight-yellow/50 px-4 text-[15px] font-extrabold text-radar-purple/70">
      {children}
      <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] tracking-wider uppercase">Soon</span>
    </span>
  );
}

async function OverviewContent({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sp = await searchParams;
  const [account, profiles, requests] = await Promise.all([requireAccount(), getMyProfiles(), countIncomingRequests()]);
  const picked = pickProfile(profiles, sp.p);
  const o = await getOverview(profiles, picked);
  const welcome = sp.welcome === "1";
  const passwordUpdated = sp.password === "updated";

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {(welcome || passwordUpdated) && (
        <p role="status" className="rounded-card bg-spotlight-yellow px-4 py-3 font-extrabold">
          {welcome ? "Your email is confirmed. Welcome to Comedy Radar!" : "Your new password is saved."}
        </p>
      )}
      {account.is_suspended && (
        <p role="alert" className="rounded-card bg-laugh-pink px-4 py-3 font-extrabold">
          This account is suspended. Please contact comedyradarnetwork@gmail.com.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[36px] leading-none md:text-[48px]">HI, {firstName(account.display_name).toUpperCase()}</h1>
        <p className="text-base text-radar-purple/80">
          {picked
            ? `Showing ${picked.name} only.`
            : profiles.length === 0
              ? "Welcome! Your profiles will show up here."
              : profiles.length === 1
                ? "You manage 1 profile."
              : `You manage ${profiles.length} profiles.`}
        </p>
      </div>

      {requests > 0 && (
        <p className="rounded-card border-2 border-laugh-pink bg-white px-4 py-3 font-bold">
          {requests === 1 ? "1 request is" : `${requests} requests are`} waiting for your answer. You will be able to answer them on the Requests page soon.
        </p>
      )}

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Upcoming shows" value={o.upcomingCount} />
        <StatTile label="Page views" value={o.views} note="Last 30 days" />
        <StatTile label="Ticket clicks" value={o.clicks} note="Last 30 days" />
        <StatTile label="Pending review" value={o.pendingReview} note="Profiles and shows" />
      </section>

      <section aria-labelledby="quick" className="flex flex-col gap-3">
        <h2 id="quick" className="text-heading font-extrabold">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <SoonButton>Add a show</SoonButton>
          <SoonButton>Add a tour</SoonButton>
          <SoonButton>Create or claim a profile</SoonButton>
        </div>
      </section>

      <section aria-labelledby="my-profiles" className={`${card} flex flex-col gap-4`}>
        <h2 id="my-profiles" className="text-heading font-extrabold">
          My profiles
        </h2>
        {profiles.length === 0 ? (
          <p className="text-base text-radar-purple/80">
            You don&apos;t manage any profile yet. Soon you will be able to create your comedian or group page, or claim
            the one already on Comedy Radar, right from here.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(picked ? [picked] : profiles).map((p) => (
              <ProfileCard key={`${p.kind}-${p.id}`} p={p} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming" className={`${card} flex flex-col gap-4`}>
        <h2 id="upcoming" className="text-heading font-extrabold">
          Upcoming shows
        </h2>
        {o.upcoming.length === 0 ? (
          <p className="text-base text-radar-purple/80">No upcoming shows yet.</p>
        ) : (
          <ShowsTable shows={o.upcoming} />
        )}
        {o.upcomingCount > o.upcoming.length && (
          <p className="text-sm text-radar-purple/75">
            Showing the next {o.upcoming.length} of {o.upcomingCount}. The full list comes with the Shows page.
          </p>
        )}
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your dashboard">
      <div className="h-12 w-64 rounded-lg bg-white" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-white" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-card bg-white" />
    </div>
  );
}

/** Dashboard overview (spec 11.4 item 3). */
export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewContent searchParams={searchParams} />
    </Suspense>
  );
}
