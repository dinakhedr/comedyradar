import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, StatTile, Tag, yellowBtn, type Tone } from "@/components/dashboard/ui";
import { EditIcon, ExternalIcon } from "@/components/icons";
import { CoverImage } from "@/components/placeholder-image";
import { pickProfile, profileKey } from "@/lib/dashboard";
import { getMyProfiles } from "@/lib/data/dashboard";
import { getMyTours, type ListedTour } from "@/lib/data/my-tours";
import { formatMonthRange, formatShowDate } from "@/lib/dates";
import { TOUR_TABS, tourTab } from "@/lib/tour-forms";
import { ErrorNote, SuccessNote } from "@/components/status-note";

export const metadata: Metadata = { title: "Tours" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const iconBtn = "inline-flex h-11 w-11 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const STATUS: Record<ListedTour["status"], { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "outline" },
  pending: { label: "In review", tone: "pink" },
  published: { label: "Live", tone: "yellow" },
  archived: { label: "Archived", tone: "outline" },
};

function SavedNote({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const as = one(sp.as);
  if (!as) return null;
  const dates = Number(one(sp.dates) ?? 0);
  const imported = Number(one(sp.imported) ?? 0);
  const failed = Number(one(sp.failed) ?? 0);
  const head =
    as === "published" ? "Your tour is live on Comedy Radar." : as === "pending" ? "Your tour is saved and sent to Comedy Radar for review." : "Your tour is saved as a draft. Only your team can see it.";
  const parts = [dates ? `${dates} new ${dates === 1 ? "date" : "dates"} added` : null, imported ? `${imported} existing ${imported === 1 ? "show" : "shows"} joined the tour` : null].filter(Boolean);
  return (
    <>
      <SuccessNote>
        {head} {parts.length ? `${parts.join(", ")}.` : ""}
      </SuccessNote>
      {failed > 0 && <ErrorNote>{failed === 1 ? "1 date" : `${failed} dates`} couldn&apos;t be saved. Please add {failed === 1 ? "it" : "them"} again.</ErrorNote>}
    </>
  );
}

function TourRowCard({ t }: { t: ListedTour }) {
  const status = STATUS[t.status];
  const progress = t.total ? Math.round((t.done / t.total) * 100) : 0;
  const range = t.first_at && t.last_at ? formatMonthRange(new Date(t.first_at), new Date(t.last_at)) : null;
  const warnings = [
    t.total === 0 ? "No dates yet" : null,
    t.no_link ? `${t.no_link} ${t.no_link === 1 ? "date has" : "dates have"} no ticket link` : null,
    t.in_review && t.status !== "draft" ? `${t.in_review} ${t.in_review === 1 ? "date is" : "dates are"} not live yet` : null,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-4 rounded-card border border-radar-purple/10 p-4 md:flex-row md:items-start">
      <span className="h-28 w-[90px] shrink-0 overflow-hidden rounded-xl">
        <CoverImage src={t.poster_url} alt="" iconSize={28} className="h-full w-full" tone="deep" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={status.tone}>{status.label}</Tag>
          <Tag tone="outline">{t.owner_kind === "group" ? "Group" : "Comedian"}</Tag>
          <span className="text-sm font-bold text-radar-purple/75">{t.owner_name}</span>
        </div>
        <h3 className="text-lg leading-tight font-extrabold">{t.name}</h3>
        <p className="text-sm text-radar-purple/80">
          {t.total} {t.total === 1 ? "show" : "shows"} · {t.countries} {t.countries === 1 ? "country" : "countries"}
          {range ? ` · ${range}` : ""}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Upcoming dates">
          <li>
            <span className="font-extrabold">{t.on_sale}</span> on sale
          </li>
          <li>
            <span className="font-extrabold">{t.sold_out}</span> sold out
          </li>
          <li>
            <span className="font-extrabold">{t.no_link}</span> no link
          </li>
          <li>
            <span className="font-extrabold">{t.views}</span> views (30 days)
          </li>
        </ul>
        {t.total > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-lavender" role="img" aria-label={`${t.done} of ${t.total} dates done`}>
              <div className="h-full rounded-full bg-radar-purple" style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-xs font-bold text-radar-purple/75">
              {t.done} of {t.total} done
            </span>
          </div>
        )}
        {t.next && (
          <p className="text-sm">
            <span className="font-extrabold">Next:</span> {formatShowDate(new Date(t.next.starts_at))}
            {t.next.city_name ? ` · ${t.next.city_name}` : ""}
          </p>
        )}
        {warnings.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 text-sm font-bold">
            {warnings.map((w) => (
              <li key={w} className="rounded-md bg-laugh-pink/15 px-2 py-0.5">
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 md:flex-col md:items-end">
        <Link href={`/dashboard/tours/${t.id}/edit?add=1`} className={`${outlineBtn} px-3`}>
          + Add dates
        </Link>
        <div className="flex">
          <Link href={`/dashboard/tours/${t.id}/edit`} className={iconBtn} aria-label={`Edit ${t.name}`} title="Edit tour">
            <EditIcon />
          </Link>
          {t.status === "published" && (
            <Link href={`/tours/${t.slug}`} className={iconBtn} aria-label={`View the public page of ${t.name}`} title="View page">
              <ExternalIcon />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/dashboard/tours">["searchParams"] }) {
  const sp = await searchParams;
  const profiles = await getMyProfiles();
  const tab = tourTab(one(sp.tab));
  const profile = pickProfile(profiles, sp.p);
  const q = (one(sp.q) ?? "").slice(0, 100);
  const kindRaw = one(sp.kind);
  const kind = kindRaw === "comedian" || kindRaw === "group" ? kindRaw : null;
  const list = await getMyTours({ tab, q, kind, profile });

  const hrefFor = (t: string) => {
    const u = new URLSearchParams();
    if (t !== "active") u.set("tab", t);
    if (profile) u.set("p", profileKey(profile));
    if (q) u.set("q", q);
    if (kind) u.set("kind", kind);
    const s = u.toString();
    return `/dashboard/tours${s ? `?${s}` : ""}`;
  };
  const filtered = !!(q || kind);
  const label = TOUR_TABS.find((t) => t.value === tab)!.label;

  return (
    <>
      <SavedNote sp={sp} />

      <section aria-label="Numbers" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatTile label="Active tours" value={list.tiles.active} />
        <StatTile label="Upcoming tour dates" value={list.tiles.upcomingDates} />
        <StatTile label="Dates without a ticket link" value={list.tiles.noLink} />
        <StatTile label="Tour page views" value={list.tiles.views} note="Last 30 days" />
      </section>

      <section aria-labelledby="list" className={`${card} flex flex-col gap-4`}>
        <h2 id="list" className="sr-only">
          Your tours
        </h2>
        <nav aria-label="Tour tabs" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {TOUR_TABS.map((t) => {
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

        <form method="get" action="/dashboard/tours" className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
          {tab !== "active" && <input type="hidden" name="tab" value={tab} />}
          {profile && <input type="hidden" name="p" value={profileKey(profile)} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tours-q" className={labelCls}>
              Search
            </label>
            <input id="tours-q" name="q" type="search" defaultValue={q} placeholder="Tour, comedian, group or city" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tours-kind" className={labelCls}>
              Show
            </label>
            <select id="tours-kind" name="kind" defaultValue={kind ?? ""} className={inputCls}>
              <option value="">Comedians and groups</option>
              <option value="comedian">Comedians</option>
              <option value="group">Groups</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={outlineBtn}>
              Filter
            </button>
            {filtered && (
              <Link href={tab === "active" ? "/dashboard/tours" : `/dashboard/tours?tab=${tab}`} className={`${outlineBtn} border-transparent`}>
                Clear
              </Link>
            )}
          </div>
        </form>

        {list.tours.length === 0 ? (
          <p className="text-base text-radar-purple/80">
            {filtered ? "No tours match these filters." : tab === "active" ? "No active tours yet. Add one with all its dates at once." : `No tours in ${label}.`}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.tours.map((t) => (
              <TourRowCard key={t.id} t={t} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** Dashboard Tours list (spec 11.4 item 10). */
export default function ToursPage({ searchParams }: PageProps<"/dashboard/tours">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">TOURS</h1>
        <Link href="/dashboard/tours/new" className={yellowBtn}>
          Add a tour
        </Link>
      </div>
      <Suspense fallback={<div className={`${card} h-96 animate-pulse`} aria-busy="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
