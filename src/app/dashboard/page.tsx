import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalIcon } from "@/components/icons";
import { card, ProfileCard, StatTile, Tag, yellowBtn } from "@/components/dashboard/ui";
import { firstName, pickProfile, SHOW_STATUS_LABELS } from "@/lib/dashboard";
import { formatShowDate } from "@/lib/dates";
import { countIncomingRequests, getMyProfiles, getOverview, requireAccount, type DashboardShow } from "@/lib/data/dashboard";
import { getMyInvites } from "@/lib/data/team";
import { ErrorNote, SuccessNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Overview" };

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
                    <Link
                      href={`/shows/${s.slug}`}
                      aria-label={`View the public page of ${s.title}`}
                      title="View page"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-button hover:bg-lavender"
                    >
                      <ExternalIcon />
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

async function OverviewContent({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const sp = await searchParams;
  const [account, profiles, waiting, invites] = await Promise.all([requireAccount(), getMyProfiles(), countIncomingRequests(), getMyInvites()]);
  // Team invitations have their own banners below; this counts the other requests.
  const requests = Math.max(0, waiting - invites.length);
  const picked = pickProfile(profiles, sp.p);
  const o = await getOverview(profiles, picked);
  const welcome = sp.welcome === "1";
  const passwordUpdated = sp.password === "updated";
  const team = sp.team === "joined" ? "You joined the team. Their profiles are now in your dashboard." : sp.team === "declined" ? "You declined the invitation." : null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {(welcome || passwordUpdated) && (
        <SuccessNote>{welcome ? "Your email is confirmed. Welcome to Comedy Radar!" : "Your new password is saved."}</SuccessNote>
      )}
      {team && (
        <SuccessNote>{team}</SuccessNote>
      )}
      {invites.map((i) => (
        <p key={i.token} className="rounded-card border-2 border-laugh-pink bg-white px-4 py-3 font-bold">
          {i.owner_name} invited you to their team.{" "}
          <Link href={`/team/invite/${i.token}`} className="font-extrabold underline">
            See the invitation
          </Link>
        </p>
      ))}
      {account.is_suspended && (
        <ErrorNote>This account is suspended. Please contact comedyradarnetwork@gmail.com.</ErrorNote>
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
          {requests === 1 ? "1 request is" : `${requests} requests are`} waiting for your answer.{" "}
          <Link href="/dashboard/requests" className="font-extrabold underline">
            Open Requests
          </Link>
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
          <Link href="/dashboard/shows/new" className={yellowBtn}>
            Add a show
          </Link>
          <Link href="/dashboard/tours/new" className={yellowBtn}>
            Add a tour
          </Link>
          <Link href="/dashboard/profiles/new" className={yellowBtn}>
            Create or claim a profile
          </Link>
        </div>
      </section>

      <section aria-labelledby="my-profiles" className={`${card} flex flex-col gap-4`}>
        <h2 id="my-profiles" className="text-heading font-extrabold">
          My profiles
        </h2>
        {profiles.length === 0 ? (
          <p className="text-base text-radar-purple/80">
            You don&apos;t manage any profile yet.{" "}
            <Link href="/dashboard/profiles/new" className="font-extrabold underline">
              Create your comedian or group page, or claim the one already on Comedy Radar
            </Link>
            .
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
            Showing the next {o.upcoming.length} of {o.upcomingCount}.{" "}
            <Link href="/dashboard/shows" className="font-extrabold underline">
              See all shows
            </Link>
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
