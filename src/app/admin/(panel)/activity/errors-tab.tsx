import Link from "next/link";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn } from "@/components/dashboard/ui";
import { AlertIcon } from "@/components/icons";
import { groupByDay } from "@/lib/admin-activity";
import { getSiteErrors } from "@/lib/data/admin";
import {
  ERROR_PERIODS,
  ERROR_SOURCES,
  browserName,
  errorPeriodOf,
  errorSourceOf,
  sourceLabel,
  type SiteError,
} from "@/lib/site-errors";

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

function ErrorEntry({ e }: { e: SiteError }) {
  const browser = browserName(e.user_agent);
  const details = [
    e.route && `Route: ${e.route}`,
    e.method && `Method: ${e.method}`,
    browser && `Browser: ${browser}`,
    e.times > 1 && `Last time: ${time(e.last_seen_at)}`,
    e.stack && `Stack:\n${e.stack}`,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:gap-4">
      <span className="w-16 shrink-0 text-sm font-bold text-radar-purple/75">
        {time(e.created_at)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex items-start gap-1.5 font-extrabold break-words text-[#d12a1f]">
          <AlertIcon size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0">{e.message}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="break-all">
            <b className="font-extrabold">Page:</b> {e.path ?? "unknown"}
          </span>
          <span>
            <b className="font-extrabold">Reference:</b>{" "}
            {e.digest ? (
              <code className="rounded-md bg-lavender px-1.5 py-0.5 select-all">
                {e.digest}
              </code>
            ) : (
              "none (browser error)"
            )}
          </span>
          <span>
            <b className="font-extrabold">Who:</b>{" "}
            {e.who ?? "Visitor (not signed in)"}
            {e.who && e.role && (
              <span className="ml-1 text-xs text-radar-purple/70">
                {e.role}
              </span>
            )}
          </span>
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider uppercase ${e.source === "browser" ? "bg-lavender text-radar-purple" : "bg-stage-black text-white"}`}
          >
            {sourceLabel(e.source)}
          </span>
          {e.times > 1 && (
            <span className="text-[13px] font-extrabold text-[#d12a1f]">
              Happened {e.times} times
            </span>
          )}
        </div>
        {details.length > 0 && (
          <details className="group">
            <summary className="w-fit cursor-pointer list-none text-sm font-extrabold underline">
              <span className="group-open:hidden">Technical details</span>
              <span className="hidden group-open:inline">
                Hide technical details
              </span>
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-lavender/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {details.join("\n")}
            </pre>
          </details>
        )}
      </div>
    </li>
  );
}

/** Errors tab of the Activity log: errors visitors and admins hit on the website. */
export async function ErrorsTab({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).slice(0, 80);
  const source = errorSourceOf(one(sp.source));
  const period = errorPeriodOf(one(sp.period) || undefined);
  const n = Math.min(Math.max(Number(one(sp.n)) || PAGE, PAGE), 2000);
  const data = await getSiteErrors({ q, source, period, limit: n });
  const days = groupByDay(data.rows);

  const params = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({
      tab: "errors",
      q,
      source,
      period: period === "7d" ? "" : period,
      ...over,
    }))
      if (v) u.set(k, v);
    return u.toString();
  };
  const filtered = q || source || period !== "7d";

  return (
    <section
      aria-labelledby="errors"
      className={`${card} flex min-w-0 flex-col gap-5`}
    >
      <h2 id="errors" className="sr-only">
        Errors
      </h2>
      <form
        method="get"
        action="/admin/activity"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end"
      >
        <input type="hidden" name="tab" value="errors" />
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
          <label htmlFor="er-q" className={labelCls}>
            Search
          </label>
          <input
            id="er-q"
            name="q"
            defaultValue={q}
            placeholder="Reference, page or message"
            className={`${inputCls} min-h-11`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="er-source" className={labelCls}>
            Where
          </label>
          <select
            id="er-source"
            name="source"
            defaultValue={source}
            className={`${inputCls} min-h-11`}
          >
            <option value="">Everywhere</option>
            {ERROR_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="er-period" className={labelCls}>
            Period
          </label>
          <select
            id="er-period"
            name="period"
            defaultValue={period}
            className={`${inputCls} min-h-11`}
          >
            {ERROR_PERIODS.map((p) => (
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
              href="/admin/activity?tab=errors"
              className={`${outlineBtn} border-transparent`}
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-radar-purple/10 py-2">
        <p className="text-sm text-radar-purple/75">
          Errors visitors and admins hit on the website. Kept for 90 days. The
          red number = errors in the last 24 hours.
        </p>
        <a
          href={`/admin/activity/errors-export?${params({ tab: "" })}`}
          className={`${outlineBtn} min-h-11 px-3 text-sm`}
          download
        >
          Export CSV
        </a>
      </div>

      {days.length === 0 ? (
        <p className="text-radar-purple/80">
          {filtered ? "No errors match these filters." : "No errors. All good!"}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((d) => (
            <section
              key={d.day}
              aria-labelledby={`err-day-${d.day}`}
              className="flex flex-col"
            >
              <h3
                id={`err-day-${d.day}`}
                className="sticky top-0 z-10 bg-white py-1 text-sm font-extrabold tracking-wider text-radar-purple/70 uppercase"
              >
                {dayTitle(d.day)}
              </h3>
              <ul className="flex flex-col divide-y divide-radar-purple/10">
                {d.rows.map((e) => (
                  <ErrorEntry key={e.id} e={e} />
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
