import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { card, StatTile, Tag } from "@/components/dashboard/ui";
import { formatShowDate } from "@/lib/dates";
import { getAdminOverview, type QueueItem } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Overview" };

const QUEUE_LABELS: Record<QueueItem["type"], string> = {
  claims: "Claims",
  profiles: "New profiles",
  shows: "Shows",
  venues: "Venues",
  names: "Name changes",
};
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Cairo" });
const ago = (iso: string) => {
  const days = Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
};
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });

async function Content() {
  await connection();
  const o = await getAdminOverview();
  if (!o) return <p className={card}>The overview could not be loaded. Please reload the page.</p>;
  const waiting = o.queue.reduce((n, q) => n + q.count, 0);
  const autoFill = Math.max(0, 5 - o.spotlight_now.length);

  return (
    <>
      <section aria-label="Site numbers" className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <StatTile label="Upcoming live shows" value={o.upcoming_shows} />
        <StatTile label="Active tours" value={o.active_tours} />
        <StatTile label="Profiles" value={o.profiles} note={`${o.profiles_verified} verified · ${o.profiles_no_admin} no admin`} />
        <StatTile label="Creator accounts" value={o.creator_accounts} />
        <StatTile label="Waiting for review" value={waiting} />
      </section>
      <section aria-label="Last 30 days" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Page views" value={o.views_30} note="Last 30 days" />
        <StatTile label="Ticket clicks" value={o.clicks_30} note="Last 30 days" />
        <StatTile label="Newsletter subscribers" value={o.subscribers} note="All time" />
        <StatTile label="Spotlight clicks" value={o.spotlight_clicks_30} note="Last 30 days" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="queue" className={`${card} flex flex-col gap-3`}>
          <h2 id="queue" className="text-heading font-extrabold">
            Review queue
          </h2>
          <ul className="flex flex-col divide-y divide-radar-purple/10">
            {o.queue.map((q) => (
              <li key={q.type} className="flex min-h-12 items-center gap-3 py-2">
                <span className="flex-1 font-bold">{QUEUE_LABELS[q.type]}</span>
                <span className="text-sm text-radar-purple/70">{q.count > 0 && q.oldest ? `Oldest ${ago(q.oldest)}` : ""}</span>
                <span className={`min-w-8 rounded-full px-2 text-center text-sm font-extrabold ${q.count ? "bg-laugh-pink" : "bg-lavender"}`}>{q.count}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/review" className="self-start font-extrabold underline">Open the Review queue</Link>
        </section>

        <section aria-labelledby="attention" className={`${card} flex flex-col gap-3`}>
          <h2 id="attention" className="text-heading font-extrabold">
            Needs attention
          </h2>
          <div className="flex flex-col gap-1">
            <h3 className="font-extrabold">Shows in the next 7 days without a ticket link ({o.no_ticket_soon_count})</h3>
            {o.no_ticket_soon.length === 0 ? (
              <p className="text-sm text-radar-purple/75">None. Every show this week has a ticket link.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {o.no_ticket_soon.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/shows/${s.slug}`} className="font-bold underline">
                      {s.title}
                    </Link>{" "}
                    · {formatShowDate(new Date(s.starts_at))}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-extrabold">Auto-filled Spotlight slides ({autoFill})</h3>
            <p className="text-sm text-radar-purple/75">
              {autoFill ? `${autoFill} of the 5 homepage slides are filled automatically with the next shows.` : "All 5 slides have a placement."}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-extrabold">Seeded profiles with shows but no admin ({o.seeded_no_admin.length})</h3>
            {o.seeded_no_admin.length === 0 ? (
              <p className="text-sm text-radar-purple/75">None.</p>
            ) : (
              <p className="text-sm">
                {o.seeded_no_admin.map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 && ", "}
                    <Link href={`/comedians/${c.slug}`} className="font-bold underline">
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="spot" className={`${card} flex flex-col gap-3`}>
          <h2 id="spot" className="text-heading font-extrabold">
            Spotlight right now
          </h2>
          <ol className="flex flex-col gap-2">
            {o.spotlight_now.map((s, i) => (
              <li key={`${s.slug}-${i}`} className="flex items-center gap-3 rounded-button bg-lavender p-3">
                <span className="font-display text-xl">{i + 1}</span>
                <span className="min-w-0 flex-1 font-bold">{s.title}</span>
                {s.is_paid ? <Tag tone="yellow">Paid</Tag> : <Tag tone="outline">Free</Tag>}
                <span className="text-xs text-radar-purple/70">until {day(s.ends_at)}</span>
              </li>
            ))}
            {Array.from({ length: autoFill }, (_, i) => (
              <li key={`auto-${i}`} className="flex items-center gap-3 rounded-button border-2 border-dashed border-radar-purple/20 p-3">
                <span className="font-display text-xl">{o.spotlight_now.length + i + 1}</span>
                <span className="flex-1 text-sm text-radar-purple/75">Next upcoming show</span>
                <Tag tone="outline">Auto fill</Tag>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="activity" className={`${card} flex flex-col gap-3`}>
          <h2 id="activity" className="text-heading font-extrabold">
            Recent activity
          </h2>
          {o.recent_activity.length === 0 ? (
            <p className="text-sm text-radar-purple/75">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-radar-purple/10 text-sm">
              {o.recent_activity.map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-2 py-2">
                  <strong>{a.who}</strong>
                  <span>
                    {a.action} · {a.entity_type}
                  </span>
                  <span className="ml-auto text-radar-purple/70">{when(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="pt-2 font-extrabold">This week</h3>
          <p className="text-sm">
            {o.new_accounts_7} new {o.new_accounts_7 === 1 ? "account" : "accounts"} · {o.claims_approved_7} {o.claims_approved_7 === 1 ? "claim" : "claims"} approved
          </p>
        </section>
      </div>
    </>
  );
}

/** Admin overview (spec 11.5 item 1). */
export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">OVERVIEW</h1>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content />
      </Suspense>
    </div>
  );
}
