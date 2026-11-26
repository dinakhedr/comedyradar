import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { card, outlineBtn, StatTile, yellowBtn } from "@/components/dashboard/ui";
import { ShowsTable } from "@/components/shows/shows-table";
import { pickProfile, profileKey } from "@/lib/dashboard";
import { getMyProfiles } from "@/lib/data/dashboard";
import { getMyShows } from "@/lib/data/my-shows";
import { inputCls, labelCls } from "@/components/auth/fields";
import { SHOW_TABS, showTab } from "@/lib/show-forms";

export const metadata: Metadata = { title: "Shows" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SAVED: Record<string, string> = {
  published: "Your show is live on Comedy Radar.",
  pending: "Your show is saved and sent to Comedy Radar for review. It goes live once it is approved.",
  draft: "Your show is saved as a draft. Only your team can see it.",
  sold_out: "Your show is saved.",
  cancelled: "Your show is saved.",
};

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/shows">["searchParams"] }) {
  const sp = await searchParams;
  const profiles = await getMyProfiles();
  const tab = showTab(one(sp.tab));
  const profile = pickProfile(profiles, sp.p);
  const q = (one(sp.q) ?? "").slice(0, 100);
  const cityRaw = one(sp.city);
  const city = cityRaw && UUID.test(cityRaw) ? cityRaw : null;
  const list = await getMyShows({ tab, q, profile, city });
  const saved = one(sp.as);

  // Keeps the other filters when switching tabs.
  const hrefFor = (t: string) => {
    const u = new URLSearchParams();
    if (t !== "upcoming") u.set("tab", t);
    if (profile) u.set("p", profileKey(profile));
    if (q) u.set("q", q);
    if (city) u.set("city", city);
    const s = u.toString();
    return `/dashboard/shows${s ? `?${s}` : ""}`;
  };
  const filtered = !!(q || city || profile);

  return (
    <>
      {saved && SAVED[saved] && (
        <p role="status" className="rounded-card bg-spotlight-yellow px-4 py-3 font-extrabold">
          {SAVED[saved]}
        </p>
      )}

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Upcoming shows" value={list.tiles.upcoming} />
        <StatTile label="Drafts" value={list.tiles.drafts} />
        <StatTile label="In review" value={list.tiles.review} />
        <StatTile label="Ticket clicks" value={list.tiles.clicks} note="Last 30 days" />
      </section>

      <section aria-labelledby="list" className={`${card} flex flex-col gap-4`}>
        <h2 id="list" className="sr-only">
          Your shows
        </h2>
        <nav aria-label="Show tabs" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {SHOW_TABS.map((t) => {
            const active = t.value === tab;
            return (
              <Link
                key={t.value}
                href={hrefFor(t.value)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-button px-3 text-[15px] font-extrabold ${active ? "bg-radar-purple text-white" : "text-radar-purple hover:bg-lavender"}`}
              >
                {t.label}
                <span className={`rounded-full px-2 text-xs ${active ? "bg-white text-radar-purple" : "bg-lavender"}`}>{list.counts[t.value]}</span>
              </Link>
            );
          })}
        </nav>

        <form method="get" action="/dashboard/shows" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          {tab !== "upcoming" && <input type="hidden" name="tab" value={tab} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="shows-q" className={labelCls}>
              Search
            </label>
            <input id="shows-q" name="q" type="search" defaultValue={q} placeholder="Show, venue, city or comedian" className={inputCls} />
          </div>
          {profiles.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="shows-p" className={labelCls}>
                Profile
              </label>
              <select id="shows-p" name="p" defaultValue={profile ? profileKey(profile) : ""} className={inputCls}>
                <option value="">All my profiles</option>
                {profiles.map((p) => (
                  <option key={profileKey(p)} value={profileKey(p)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {list.cities.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="shows-city" className={labelCls}>
                City
              </label>
              <select id="shows-city" name="city" defaultValue={city ?? ""} className={inputCls}>
                <option value="">All cities</option>
                {list.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className={outlineBtn}>
              Filter
            </button>
            {filtered && (
              <Link href={tab === "upcoming" ? "/dashboard/shows" : `/dashboard/shows?tab=${tab}`} className={`${outlineBtn} border-transparent`}>
                Clear
              </Link>
            )}
          </div>
        </form>

        {list.shows.length === 0 ? (
          <p className="text-base text-radar-purple/80">
            {filtered ? "No shows match these filters." : tab === "upcoming" ? "No upcoming shows yet." : `No shows in ${SHOW_TABS.find((t) => t.value === tab)!.label}.`}
          </p>
        ) : (
          <ShowsTable shows={list.shows} past={tab === "past"} />
        )}
      </section>
    </>
  );
}

/** Dashboard Shows list (spec 11.4 item 9). */
export default function ShowsPage({ searchParams }: PageProps<"/dashboard/shows">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">SHOWS</h1>
        <Link href="/dashboard/shows/new" className={yellowBtn}>
          Add a show
        </Link>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
