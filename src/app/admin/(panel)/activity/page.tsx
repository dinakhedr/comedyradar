import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, Tag, type Tone } from "@/components/dashboard/ui";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_PERIODS,
  ACTIVITY_TYPES,
  actionLabel,
  activityActionOf,
  activityPeriodOf,
  activityTypeOf,
  changeRows,
  groupByDay,
  typeLabel,
  type ActivityEntry,
} from "@/lib/admin-activity";
import { getAdminActivity, getSiteErrorCount } from "@/lib/data/admin";
import { ErrorsTab } from "./errors-tab";
import { UUID } from "@/lib/profile-server";

export const metadata: Metadata = { title: "Activity log" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const PAGE = 100;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
const dayTitle = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const TYPE_TONE: Record<string, Tone> = {
  show: "yellow",
  tour: "yellow",
  spotlight: "pink",
  access: "purple",
  team: "purple",
};

/** Where an entry's item can be found in the admin panel. */
function itemHref(e: ActivityEntry): string | null {
  const q = encodeURIComponent(e.target ?? "");
  switch (e.entity_type) {
    case "comedian":
      return `/admin/comedians?q=${q}`;
    case "group":
      return `/admin/groups?q=${q}`;
    case "access":
      return `/admin/comedians?q=${q}`;
    case "show":
      return `/admin/shows?period=all&q=${q}`;
    case "tour":
      return `/admin/shows?tab=tours&q=${q}`;
    case "podcast":
      return `/admin/shows?tab=podcasts&q=${q}`;
    case "venue":
      return `/admin/shows?tab=venues&q=${q}`;
    case "spotlight":
      return "/admin/spotlight";
    case "team":
      return e.who ? `/admin/accounts?q=${encodeURIComponent(e.who)}` : null;
    default:
      return null;
  }
}

function Entry({ e }: { e: ActivityEntry }) {
  const rows = changeRows(e.changes);
  const href = e.target ? itemHref(e) : null;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:gap-4">
      <span className="w-16 shrink-0 text-sm font-bold text-radar-purple/75">
        {time(e.created_at)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-extrabold">{e.who ?? "System"}</span>
          {e.who && (
            <span className="text-xs text-radar-purple/70">{e.role}</span>
          )}
          <span>{actionLabel(e.action).toLowerCase()}</span>
          {href ? (
            <Link href={href} className="font-bold break-words underline">
              {e.target}
            </Link>
          ) : (
            <span className="font-bold break-words">
              {e.target ?? "an item that no longer exists"}
            </span>
          )}
          <Tag tone={TYPE_TONE[e.entity_type] ?? "outline"}>
            {typeLabel(e.entity_type)}
          </Tag>
        </p>
        {rows.length > 0 && (
          <div className="relative overflow-x-auto">
            <table className="w-full max-w-3xl min-w-[420px] table-fixed text-left text-xs">
              <thead>
                <tr className="text-radar-purple/70 uppercase">
                  <th className="w-1/4 py-1 pr-3 font-extrabold">Field</th>
                  <th className="py-1 pr-3 font-extrabold">Before</th>
                  <th className="py-1 font-extrabold">After</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.field}
                    className="border-t border-radar-purple/10 align-top"
                  >
                    <td className="py-1 pr-3 font-bold whitespace-nowrap">
                      {r.field}
                    </td>
                    <td className="py-1 pr-3 break-words text-radar-purple/70 line-through decoration-radar-purple/30">
                      {r.from}
                    </td>
                    <td className="py-1 break-words">{r.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </li>
  );
}

async function ChangesTab({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const q = one(sp.q).slice(0, 80);
  const who = UUID.test(one(sp.who)) ? one(sp.who) : "";
  const type = activityTypeOf(one(sp.type));
  const action = activityActionOf(one(sp.action));
  const period = activityPeriodOf(one(sp.period) || undefined);
  const n = Math.min(Math.max(Number(one(sp.n)) || PAGE, PAGE), 2000);
  const data = await getAdminActivity({
    q,
    who,
    type,
    action,
    period,
    limit: n,
  });
  const days = groupByDay(data.rows);

  const params = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({
      q,
      who,
      type,
      action,
      period: period === "30d" ? "" : period,
      ...over,
    }))
      if (v) u.set(k, v);
    return u.toString();
  };
  const filtered = q || who || type || action || period !== "30d";

  return (
    <section
      aria-labelledby="log"
      className={`${card} flex min-w-0 flex-col gap-5`}
    >
      <h2 id="log" className="sr-only">
        Activity
      </h2>
      <form
        method="get"
        action="/admin/activity"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <label htmlFor="al-q" className={labelCls}>
            Search
          </label>
          <input
            id="al-q"
            name="q"
            defaultValue={q}
            placeholder="Item or person"
            className={`${inputCls} min-h-11`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="al-who" className={labelCls}>
            Who
          </label>
          <select
            id="al-who"
            name="who"
            defaultValue={who}
            className={`${inputCls} min-h-11`}
          >
            <option value="">Everyone</option>
            {data.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="al-type" className={labelCls}>
            Type
          </label>
          <select
            id="al-type"
            name="type"
            defaultValue={type}
            className={`${inputCls} min-h-11`}
          >
            <option value="">All types</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="al-action" className={labelCls}>
            Action
          </label>
          <select
            id="al-action"
            name="action"
            defaultValue={action}
            className={`${inputCls} min-h-11`}
          >
            <option value="">All actions</option>
            {ACTIVITY_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="al-period" className={labelCls}>
            Period
          </label>
          <select
            id="al-period"
            name="period"
            defaultValue={period}
            className={`${inputCls} min-h-11`}
          >
            {ACTIVITY_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={outlineBtn}>
            Show
          </button>
          {filtered && (
            <Link
              href="/admin/activity"
              className={`${outlineBtn} border-transparent`}
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-radar-purple/10 py-2">
        <p className="text-sm text-radar-purple/75">
          Every create, edit, publish, cancel, invite and role change. Kept for
          24 months.
        </p>
        <a
          href={`/admin/activity/export?${params({})}`}
          className={`${outlineBtn} min-h-11 px-3 text-sm`}
          download
        >
          Export CSV
        </a>
      </div>

      {days.length === 0 ? (
        <p className="text-radar-purple/80">
          {filtered
            ? "Nothing matches these filters."
            : "Nothing has happened yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((d) => (
            <section
              key={d.day}
              aria-labelledby={`day-${d.day}`}
              className="flex flex-col"
            >
              <h3
                id={`day-${d.day}`}
                className="sticky top-0 z-10 bg-white py-1 text-sm font-extrabold tracking-wider text-radar-purple/70 uppercase"
              >
                {dayTitle(d.day)}
              </h3>
              <ul className="flex flex-col divide-y divide-radar-purple/10">
                {d.rows.map((e) => (
                  <Entry key={e.id} e={e} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {data.more &&
        (n < 2000 ? (
          <Link
            href={`/admin/activity?${params({ n: String(n + PAGE) })}`}
            scroll={false}
            className={`${outlineBtn} self-center`}
          >
            Load older
          </Link>
        ) : (
          <p className="text-center text-sm text-radar-purple/75">
            Showing the newest 2,000. Use the filters or Export CSV for more.
          </p>
        ))}
    </section>
  );
}

/** Tabs: Changes (who changed what) and Errors (website errors). */
async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/admin/activity">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const tab = one(sp.tab) === "errors" ? "errors" : "changes";
  const errors24 = await getSiteErrorCount();
  const tabs = [
    { value: "changes", label: "Changes", href: "/admin/activity" },
    { value: "errors", label: "Errors", href: "/admin/activity?tab=errors" },
  ] as const;
  return (
    <>
      <nav
        aria-label="Activity log tabs"
        className="-mx-1 flex gap-1 overflow-x-auto pb-1"
      >
        {tabs.map((t) => {
          const active = t.value === tab;
          return (
            <Link
              key={t.value}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-button px-3 text-[15px] font-extrabold ${active ? "bg-stage-black text-white" : "bg-white hover:bg-lavender"}`}
            >
              {t.label}
              {t.value === "errors" && errors24 > 0 && (
                <span
                  className="rounded-full bg-[#d12a1f] px-2 text-xs leading-5 text-white"
                  title="Errors in the last 24 hours"
                >
                  <span className="sr-only">, in the last 24 hours: </span>
                  {errors24}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {tab === "errors" ? <ErrorsTab sp={sp} /> : <ChangesTab sp={sp} />}
    </>
  );
}

/** Admin Activity log (spec 11.5 item 7). */
export default function AdminActivityPage({
  searchParams,
}: PageProps<"/admin/activity">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">
        ACTIVITY LOG
      </h1>
      <Suspense
        fallback={
          <div className={`${card} h-96 animate-pulse`} aria-busy="true" />
        }
      >
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
