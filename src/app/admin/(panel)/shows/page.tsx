import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  declineSignalRequest,
  setContentStatus,
  setShowSignal,
  setShowStatus,
  setTicketLink,
} from "@/app/actions/admin-shows";
import { updateVenue } from "@/app/actions/admin-settings";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import {
  card,
  outlineBtn,
  StatTile,
  Tag,
  yellowBtn,
} from "@/components/dashboard/ui";
import {
  CloseIcon,
  EditIcon,
  ExternalIcon,
  StarIcon,
} from "@/components/icons";
import {
  CONTENT_STATUSES,
  contentStatusOf,
  labelOf,
  PERIODS,
  periodOf,
  SHOW_STATUSES,
  SHOW_TABS,
  showStatusOf,
  showTab,
  SIGNALS,
  ticketCheck,
  isFuture,
  ZONES,
  zoneOf,
  type ShowTab,
} from "@/lib/admin-shows";
import { flagOf } from "@/lib/countries";
import {
  getAdminPodcasts,
  getAdminShows,
  getAdminTours,
  getAdminVenues,
  type AdminShowRow,
  type AdminVenueRow,
} from "@/lib/data/admin";
import { formatShowDate } from "@/lib/dates";
import { UUID } from "@/lib/profile-server";

export const metadata: Metadata = { title: "Shows and tours" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, string> = {
  saved: "Saved.",
  declined: "Signal change request declined. The signal stays as it is.",
  none_picked: "Tick at least one show first.",
  bad_url: "That ticket link is not a web link. It must start with https://",
  venue_saved: "Venue saved.",
  venue_exists: "That city already has a venue with this name.",
  venue_bad:
    "Check the venue: a name, a Google Maps link (google.com/maps or maps.app.goo.gl) and, if you add them, a website starting with https://, an Instagram handle or link and a Facebook page link.",
  error: "Something went wrong. Please try again.",
};
const iconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender";
const smallSelect =
  "min-h-11 rounded-button border-2 border-radar-purple/25 bg-white px-2 text-sm font-bold";
const smallBtn = `${outlineBtn} min-h-11 px-3 text-sm`;
const th = "px-2 py-2 font-extrabold";
const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Cairo",
      })
    : "";

function showStatusTag(s: string) {
  if (s === "published") return <Tag tone="yellow">Published</Tag>;
  if (s === "sold_out") return <Tag tone="purple">Sold out</Tag>;
  if (s === "pending") return <Tag tone="pink">In review</Tag>;
  if (s === "cancelled") return <Tag tone="pink">Cancelled</Tag>;
  return <Tag tone="outline">Draft</Tag>;
}
function contentStatusTag(s: string) {
  if (s === "published") return <Tag tone="yellow">Published</Tag>;
  if (s === "pending") return <Tag tone="pink">Pending</Tag>;
  return <Tag tone="outline">{labelOf(CONTENT_STATUSES, s)}</Tag>;
}
function TicketTag({ url }: { url: string | null }) {
  const c = ticketCheck(url);
  if (c === "ok") return <Tag tone="outline">Link OK</Tag>;
  return <Tag tone="pink">{c === "missing" ? "Missing" : "Not a link"}</Tag>;
}

function Hidden({ ret, more }: { ret: string; more?: Record<string, string> }) {
  return (
    <>
      <input type="hidden" name="ret" value={ret} />
      {Object.entries(more ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

/** A status selector and Save, for tours, podcasts and venues. */
function StatusForm({
  kind,
  id,
  status,
  ret,
  name,
}: {
  kind: string;
  id: string;
  status: string;
  ret: string;
  name: string;
}) {
  return (
    <form
      action={setContentStatus}
      className="flex items-center justify-end gap-1"
    >
      <Hidden ret={ret} more={{ kind, id }} />
      <label htmlFor={`st-${id}`} className="sr-only">
        Status of {name}
      </label>
      <select
        id={`st-${id}`}
        name="status"
        defaultValue={status}
        className={smallSelect}
      >
        {CONTENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button className={smallBtn}>Save</button>
    </form>
  );
}

function ShowPanel({
  s,
  ret,
  close,
}: {
  s: AdminShowRow;
  ret: string;
  close: string;
}) {
  const asked =
    s.signal_request && s.signal_request !== s.signal ? s.signal_request : null;
  return (
    <aside
      aria-labelledby="panel"
      className={`${card} order-first flex min-w-0 flex-col gap-5 2xl:sticky 2xl:top-6 2xl:order-none`}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="panel" className="text-heading font-extrabold break-words">
            {s.title}
          </h2>
          <p className="text-sm text-radar-purple/75">
            {formatShowDate(new Date(s.starts_at))}
          </p>
          <p className="text-sm break-words text-radar-purple/75">
            {[s.venue, `${flagOf(s.country_code)} ${s.city}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {s.performers && (
            <p className="text-sm font-bold break-words">{s.performers}</p>
          )}
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {showStatusTag(s.status)}{" "}
            <Tag tone="outline">{labelOf(ZONES, s.zone)}</Tag>
          </p>
        </div>
        {(s.status === "published" || s.status === "sold_out") && (
          <a
            href={`/shows/${s.slug}`}
            target="_blank"
            rel="noreferrer"
            className={iconBtn}
            aria-label="View the public page"
            title="View the public page"
          >
            <ExternalIcon />
          </a>
        )}
        <Link href={close} className={iconBtn} aria-label="Close" title="Close">
          <CloseIcon size={20} />
        </Link>
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="font-bold">Added by</dt>
        <dd className="break-words">{s.added_by ?? "Unknown"}</dd>
        {s.tour && (
          <>
            <dt className="font-bold">Tour</dt>
            <dd className="break-words">{s.tour}</dd>
          </>
        )}
      </dl>

      <div className="grid items-start gap-4 lg:grid-cols-3 2xl:grid-cols-1">
        <form
          action={setShowStatus}
          className="flex flex-col gap-2 rounded-button bg-lavender p-3"
        >
          <Hidden ret={ret} more={{ ids: s.id }} />
          <label htmlFor="sp-status" className={labelCls}>
            Status
          </label>
          <div className="flex gap-2">
            <select
              id="sp-status"
              name="status"
              defaultValue={s.status}
              className={`${inputCls} min-h-11 flex-1`}
            >
              {SHOW_STATUSES.filter((x) => x.value !== "asked").map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
            <button className={yellowBtn}>Save</button>
          </div>
          <p className="text-xs text-radar-purple/70">
            Draft takes the show off the public pages. Cancelled keeps it listed
            as cancelled.
          </p>
        </form>

        <div className="flex flex-col gap-2">
          <form
            action={setShowSignal}
            className="flex flex-col gap-2 rounded-button bg-lavender p-3"
          >
            <Hidden ret={ret} more={{ ids: s.id }} />
            <label htmlFor="sp-signal" className={labelCls}>
              Signal
            </label>
            <div className="flex gap-2">
              <select
                id="sp-signal"
                name="signal"
                defaultValue={s.signal}
                className={`${inputCls} min-h-11 flex-1`}
              >
                {SIGNALS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
              <button className={yellowBtn}>Set</button>
            </div>
            {asked && (
              <p className="text-sm font-bold">
                The creator asked for {labelOf(SIGNALS, asked)}. To accept, pick
                it and press Set.
              </p>
            )}
          </form>
          {asked && (
            <form action={declineSignalRequest}>
              <Hidden ret={ret} more={{ id: s.id }} />
              <button className={`${outlineBtn} w-full`}>
                Decline the request
              </button>
            </form>
          )}
        </div>

        <form
          action={setTicketLink}
          className="flex flex-col gap-2 rounded-button border-2 border-radar-purple/15 p-3"
        >
          <Hidden ret={ret} more={{ id: s.id }} />
          <label
            htmlFor="sp-ticket"
            className={`${labelCls} flex items-center gap-2`}
          >
            Ticket link <TicketTag url={s.ticket_url} />
          </label>
          <input
            id="sp-ticket"
            name="ticket_url"
            type="url"
            defaultValue={s.ticket_url ?? ""}
            maxLength={500}
            placeholder="https://"
            className={inputCls}
          />
          <div className="flex items-center gap-2">
            {ticketCheck(s.ticket_url) === "ok" && (
              <a
                href={s.ticket_url!}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-extrabold underline"
              >
                Open the link
              </a>
            )}
            <button className={`${outlineBtn} ml-auto`}>Save link</button>
          </div>
        </form>
      </div>
    </aside>
  );
}

type Ctx = {
  sp: Record<string, string | string[] | undefined>;
  tab: ShowTab;
  link: (over: Record<string, string>) => string;
  msg?: string;
};

async function ShowsTab({ sp, link }: Ctx) {
  const q = one(sp.q).slice(0, 80);
  const zone = zoneOf(one(sp.zone));
  const status = showStatusOf(one(sp.status));
  const period = periodOf(one(sp.period));
  const city = UUID.test(one(sp.city)) ? one(sp.city) : "";
  const data = await getAdminShows({ q, zone, status, city, period });
  const rows = data.rows;
  const filters = {
    q,
    zone,
    status,
    city,
    period: period === "upcoming" ? "" : period,
  };
  const here = (over: Record<string, string> = {}) =>
    link({ ...filters, ...over });
  const picked = rows.find((r) => r.id === one(sp.s)) ?? null;
  const ret = here(picked ? { s: picked.id } : {});
  const filtered = q || zone || status || city || period !== "upcoming";
  const { stats, quality } = data;

  return (
    <>
      <section
        aria-label="Numbers"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6"
      >
        <StatTile label="Upcoming shows" value={stats.upcoming} />
        <StatTile label="In Egypt" value={stats.local} />
        <StatTile label="On tour" value={stats.outbound} />
        <StatTile label="Visiting" value={stats.inbound} />
        <StatTile label="Missing ticket link" value={stats.missing_ticket} />
        <StatTile label="Cancelled (upcoming)" value={stats.cancelled} />
      </section>

      <section
        aria-labelledby="quality"
        className={`${card} flex flex-col gap-3`}
      >
        <h2 id="quality" className="font-extrabold">
          Data quality and signal rules
        </h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <Link
              href={link({ status: "asked", period: "all" })}
              className={`${outlineBtn} min-h-11 px-3 text-sm`}
            >
              Signal change requests{" "}
              <span className="rounded-full bg-lavender px-2">
                {quality.signal_requests}
              </span>
            </Link>
          </li>
          <li className="inline-flex min-h-11 items-center gap-2 rounded-button border-2 border-radar-purple/15 px-3 font-extrabold">
            Upcoming shows with no venue{" "}
            <span className="rounded-full bg-lavender px-2">
              {quality.no_venue}
            </span>
          </li>
          <li>
            <Link
              href={link({ tab: "tours" })}
              className={`${outlineBtn} min-h-11 px-3 text-sm`}
            >
              Tours with a date missing a ticket link{" "}
              <span className="rounded-full bg-lavender px-2">
                {quality.tours_no_tickets}
              </span>
            </Link>
          </li>
        </ul>
        <p className="text-sm text-radar-purple/80">
          New shows get the <strong>New</strong> signal for{" "}
          {quality.new_signal_days} days, then no signal.{" "}
          <strong>Strong</strong> (high demand) and <strong>Fading</strong>{" "}
          (last tickets) are set only here. Creators can ask for a change, and
          the request shows on the show.
        </p>
      </section>

      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${picked ? "2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:items-start" : ""}`}
      >
        <section
          aria-labelledby="list"
          className={`${card} flex min-w-0 flex-col gap-4`}
        >
          <h2 id="list" className="sr-only">
            Shows
          </h2>
          <form
            method="get"
            action="/admin/shows"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="as-q" className={labelCls}>
                Search
              </label>
              <input
                id="as-q"
                name="q"
                defaultValue={q}
                placeholder="Show, comedian, venue or city"
                className={`${inputCls} min-h-11`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="as-zone" className={labelCls}>
                Zone
              </label>
              <select
                id="as-zone"
                name="zone"
                defaultValue={zone}
                className={`${inputCls} min-h-11`}
              >
                <option value="">All zones</option>
                {ZONES.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="as-status" className={labelCls}>
                Status
              </label>
              <select
                id="as-status"
                name="status"
                defaultValue={status}
                className={`${inputCls} min-h-11`}
              >
                <option value="">Any status</option>
                {SHOW_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="as-city" className={labelCls}>
                City
              </label>
              <select
                id="as-city"
                name="city"
                defaultValue={city}
                className={`${inputCls} min-h-11`}
              >
                <option value="">All cities</option>
                {data.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {flagOf(c.country_code)} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="as-period" className={labelCls}>
                Period
              </label>
              <select
                id="as-period"
                name="period"
                defaultValue={period}
                className={`${inputCls} min-h-11`}
              >
                {PERIODS.map((p) => (
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
                  href={link({})}
                  className={`${outlineBtn} border-transparent`}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          {rows.length === 0 ? (
            <p className="text-radar-purple/80">
              {filtered
                ? "No shows match these filters."
                : "No upcoming shows yet."}
            </p>
          ) : (
            <>
              <form
                id="bulk"
                className="flex flex-wrap items-center gap-2 rounded-button bg-lavender p-2"
              >
                <Hidden ret={ret} />
                <span className="px-1 text-sm font-extrabold">
                  With the ticked shows:
                </span>
                <label htmlFor="bulk-signal" className="sr-only">
                  Signal for the ticked shows
                </label>
                <select
                  id="bulk-signal"
                  name="signal"
                  defaultValue="strong"
                  className={smallSelect}
                >
                  {SIGNALS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
                <button formAction={setShowSignal} className={smallBtn}>
                  Set signal
                </button>
                <button
                  formAction={setShowStatus}
                  name="status"
                  value="draft"
                  className={smallBtn}
                >
                  Unpublish
                </button>
              </form>
              <div className="relative -mx-4 overflow-x-auto md:mx-0">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                      <th className="w-10 px-4 py-2 md:px-2">
                        <span className="sr-only">Tick</span>
                      </th>
                      <th className={th}>Date</th>
                      <th className={th}>Show</th>
                      <th className={th}>Status</th>
                      <th className={th}>Signal</th>
                      <th className={th}>Tickets</th>
                      <th className={th}>Added by</th>
                      <th className="px-2 py-2">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const asked =
                        r.signal_request && r.signal_request !== r.signal
                          ? r.signal_request
                          : null;
                      return (
                        <tr
                          key={r.id}
                          className={`border-b border-radar-purple/10 align-top ${picked?.id === r.id ? "bg-lavender" : ""}`}
                        >
                          <td className="px-4 py-3 md:px-2">
                            <input
                              type="checkbox"
                              name="ids"
                              value={r.id}
                              form="bulk"
                              aria-label={`Tick ${r.title}`}
                              className="mt-1 h-5 w-5 accent-radar-purple"
                            />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <span className="font-bold">
                              {
                                formatShowDate(new Date(r.starts_at)).split(
                                  " · ",
                                )[0]
                              }
                            </span>
                            <span className="block text-xs text-radar-purple/70">
                              {
                                formatShowDate(new Date(r.starts_at)).split(
                                  " · ",
                                )[1]
                              }
                            </span>
                          </td>
                          <td className="max-w-72 px-2 py-3">
                            <Link
                              href={here({ s: r.id })}
                              className="font-extrabold break-words hover:underline"
                            >
                              {r.title}
                            </Link>
                            {r.performers && (
                              <span className="block text-xs font-bold break-words">
                                {r.performers}
                              </span>
                            )}
                            <span className="block text-xs break-words text-radar-purple/70">
                              {[
                                r.venue,
                                `${flagOf(r.country_code)} ${r.city}`,
                                labelOf(ZONES, r.zone),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            {showStatusTag(r.status)}
                          </td>
                          <td className="px-2 py-2">
                            <form
                              action={setShowSignal}
                              className="flex items-center gap-1"
                            >
                              <Hidden ret={ret} more={{ ids: r.id }} />
                              <label
                                htmlFor={`sig-${r.id}`}
                                className="sr-only"
                              >
                                Signal for {r.title}
                              </label>
                              <select
                                id={`sig-${r.id}`}
                                name="signal"
                                defaultValue={r.signal}
                                className={smallSelect}
                              >
                                {SIGNALS.map((x) => (
                                  <option key={x.value} value={x.value}>
                                    {x.label}
                                  </option>
                                ))}
                              </select>
                              <button className={smallBtn}>Set</button>
                            </form>
                            {asked && (
                              <span className="mt-1 block text-xs font-extrabold text-laugh-pink-deep">
                                Asked: {labelOf(SIGNALS, asked)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <TicketTag url={r.ticket_url} />
                          </td>
                          <td className="max-w-40 px-2 py-3 text-xs break-words">
                            {r.added_by ?? "Unknown"}
                          </td>
                          <td className="px-2 py-1">
                            <span className="flex justify-end">
                              {(r.status === "published" ||
                                r.status === "sold_out") && (
                                <a
                                  href={`/shows/${r.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={iconBtn}
                                  aria-label={`Open ${r.title}`}
                                  title="Open the public page"
                                >
                                  <ExternalIcon />
                                </a>
                              )}
                              {r.status === "published" &&
                                isFuture(r.starts_at) && (
                                  <Link
                                    href={`/admin/spotlight?show=${r.id}#new`}
                                    className={iconBtn}
                                    aria-label={`Add ${r.title} to the Spotlight`}
                                    title="Add to the Spotlight"
                                  >
                                    <StarIcon />
                                  </Link>
                                )}
                              <Link
                                href={here({ s: r.id })}
                                className={iconBtn}
                                aria-label={`Manage ${r.title}`}
                                title="Manage"
                              >
                                <EditIcon />
                              </Link>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length >= 300 && (
                <p className="text-sm text-radar-purple/75">
                  Showing the first 300. Use the filters to narrow the list.
                </p>
              )}
            </>
          )}
        </section>
        {picked && (
          <ShowPanel key={picked.id} s={picked} ret={ret} close={here()} />
        )}
      </div>
    </>
  );
}

/** Search + status filter shared by the Tours, Podcasts and Venues tabs. */
function SimpleFilters({
  tab,
  q,
  status,
  link,
  placeholder,
}: {
  tab: ShowTab;
  q: string;
  status: string;
  link: Ctx["link"];
  placeholder: string;
}) {
  return (
    <form
      method="get"
      action="/admin/shows"
      className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end"
    >
      <input type="hidden" name="tab" value={tab} />
      <div className="flex flex-col gap-1">
        <label htmlFor="sf-q" className={labelCls}>
          Search
        </label>
        <input
          id="sf-q"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className={`${inputCls} min-h-11`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sf-status" className={labelCls}>
          Status
        </label>
        <select
          id="sf-status"
          name="status"
          defaultValue={status}
          className={`${inputCls} min-h-11`}
        >
          <option value="">Any status</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={outlineBtn}>
          Show
        </button>
        {(q || status) && (
          <Link
            href={link({ tab })}
            className={`${outlineBtn} border-transparent`}
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}

async function ToursTab({ sp, link }: Ctx) {
  const q = one(sp.q).slice(0, 80);
  const status = contentStatusOf(one(sp.status));
  const rows = await getAdminTours(q, status);
  const ret = link({ tab: "tours", q, status });
  return (
    <section
      aria-labelledby="list"
      className={`${card} flex min-w-0 flex-col gap-4`}
    >
      <h2 id="list" className="sr-only">
        Tours
      </h2>
      <SimpleFilters
        tab="tours"
        q={q}
        status={status}
        link={link}
        placeholder="Tour, comedian or group"
      />
      {rows.length === 0 ? (
        <p className="text-radar-purple/80">
          {q || status ? "No tours match these filters." : "No tours yet."}
        </p>
      ) : (
        <div className="relative -mx-4 overflow-x-auto md:mx-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                <th className="px-4 py-2 font-extrabold md:px-2">Tour</th>
                <th className={th}>Dates</th>
                <th className={`${th} text-right`}>Shows</th>
                <th className={`${th} text-right`}>Countries</th>
                <th className={th}>Tickets</th>
                <th className={th}>Status</th>
                <th className="px-2 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-radar-purple/10">
                  <td className="max-w-72 px-4 py-2 md:px-2">
                    <span className="block font-extrabold break-words">
                      {t.name}
                    </span>
                    <span className="block text-xs text-radar-purple/70">
                      {t.owner ?? "Unknown"} ·{" "}
                      {t.owner_kind === "group" ? "Group" : "Comedian"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">
                    {t.first_at
                      ? `${day(t.first_at)} – ${day(t.last_at)}`
                      : "No dates yet"}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {t.shows}
                    <span className="block text-xs text-radar-purple/70">
                      {t.upcoming} upcoming
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{t.countries}</td>
                  <td className="px-2 py-2">
                    {t.missing_ticket > 0 ? (
                      <Tag tone="pink">{t.missing_ticket} missing</Tag>
                    ) : (
                      <Tag tone="outline">OK</Tag>
                    )}
                  </td>
                  <td className="px-2 py-2">{contentStatusTag(t.status)}</td>
                  <td className="px-2 py-1">
                    <span className="flex items-center justify-end gap-1">
                      <StatusForm
                        kind="tour"
                        id={t.id}
                        status={t.status}
                        ret={ret}
                        name={t.name}
                      />
                      {t.status === "published" && (
                        <a
                          href={`/tours/${t.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={iconBtn}
                          aria-label={`Open ${t.name}`}
                          title="Open the public page"
                        >
                          <ExternalIcon />
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

async function PodcastsTab({ sp, link }: Ctx) {
  const q = one(sp.q).slice(0, 80);
  const status = contentStatusOf(one(sp.status));
  const rows = await getAdminPodcasts(q, status);
  const ret = link({ tab: "podcasts", q, status });
  return (
    <section
      aria-labelledby="list"
      className={`${card} flex min-w-0 flex-col gap-4`}
    >
      <h2 id="list" className="sr-only">
        Podcasts
      </h2>
      <SimpleFilters
        tab="podcasts"
        q={q}
        status={status}
        link={link}
        placeholder="Podcast or host"
      />
      {rows.length === 0 ? (
        <p className="text-radar-purple/80">
          {q || status
            ? "No podcasts match these filters."
            : "No podcasts yet."}
        </p>
      ) : (
        <div className="relative -mx-4 overflow-x-auto md:mx-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                <th className="px-4 py-2 font-extrabold md:px-2">Podcast</th>
                <th className={`${th} text-right`}>Listen links</th>
                <th className={th}>Status</th>
                <th className="px-2 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-radar-purple/10">
                  <td className="max-w-80 px-4 py-2 md:px-2">
                    <span className="block font-extrabold break-words">
                      {p.name}
                    </span>
                    <span className="block text-xs break-words text-radar-purple/70">
                      {p.hosts ?? "No host yet"}
                      {p.is_active ? "" : " · no new episodes"}
                    </span>
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-bold ${p.links === 0 ? "text-laugh-pink-deep" : ""}`}
                  >
                    {p.links}
                  </td>
                  <td className="px-2 py-2">{contentStatusTag(p.status)}</td>
                  <td className="px-2 py-1">
                    <StatusForm
                      kind="podcast"
                      id={p.id}
                      status={p.status}
                      ret={ret}
                      name={p.name}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

async function VenuesTab({ sp, link }: Ctx) {
  const q = one(sp.q).slice(0, 80);
  const status = contentStatusOf(one(sp.status));
  const all = await getAdminVenues(q, status);
  const countries = [
    ...new Map(all.map((v) => [v.country_code, v.country_name])).entries(),
  ];
  const country = countries.some(([c]) => c === one(sp.country))
    ? one(sp.country)
    : "";
  const inCountry = all.filter((v) => !country || v.country_code === country);
  const cities = [
    ...new Map(inCountry.map((v) => [v.city_id, v.city])).entries(),
  ];
  const city =
    country && cities.some(([c]) => c === one(sp.city)) ? one(sp.city) : "";
  const rows = inCountry.filter((v) => !city || v.city_id === city);
  const base = { tab: "venues", q, status, country, city };
  const ret = link(base);
  const editId = one(sp.edit);
  const editing = rows.find((v) => v.id === editId);
  const chip = (on: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm font-extrabold ${on ? "border-radar-purple bg-radar-purple text-white" : "border-radar-purple/20 hover:border-radar-purple"}`;
  const count = (
    list: AdminVenueRow[],
    key: "country_code" | "city_id",
    v: string,
  ) => list.filter((x) => x[key] === v).length;
  return (
    <>
      {editing && (
        <VenueEditForm
          v={editing}
          ret={link({ ...base, edit: editing.id })}
          close={ret}
        />
      )}
      <section
        aria-labelledby="list"
        className={`${card} flex min-w-0 flex-col gap-4`}
      >
        <h2 id="list" className="sr-only">
          Venues
        </h2>
        <SimpleFilters
          tab="venues"
          q={q}
          status={status}
          link={link}
          placeholder="Venue or city"
        />
        {countries.length > 0 && (
          <nav aria-label="Filter by country" className="flex flex-wrap gap-2">
            <Link
              href={link({ tab: "venues", q, status })}
              aria-current={!country ? "page" : undefined}
              className={chip(!country)}
            >
              All countries ({all.length})
            </Link>
            {countries.map(([code, name]) => (
              <Link
                key={code}
                href={link({ tab: "venues", q, status, country: code })}
                aria-current={country === code ? "page" : undefined}
                className={chip(country === code)}
              >
                {flagOf(code)} {name} ({count(all, "country_code", code)})
              </Link>
            ))}
          </nav>
        )}
        {country && cities.length > 1 && (
          <nav aria-label="Filter by city" className="flex flex-wrap gap-2">
            <Link
              href={link({ tab: "venues", q, status, country })}
              aria-current={!city ? "page" : undefined}
              className={chip(!city)}
            >
              All cities
            </Link>
            {cities.map(([id, name]) => (
              <Link
                key={id}
                href={link({ tab: "venues", q, status, country, city: id })}
                aria-current={city === id ? "page" : undefined}
                className={chip(city === id)}
              >
                {name} ({count(inCountry, "city_id", id)})
              </Link>
            ))}
          </nav>
        )}
        {rows.length === 0 ? (
          <p className="text-radar-purple/80">
            {q || status || country
              ? "No venues match these filters."
              : "No venues yet."}
          </p>
        ) : (
          <div className="relative -mx-4 overflow-x-auto md:mx-0">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                  <th className="px-4 py-2 font-extrabold md:px-2">Venue</th>
                  <th className={th}>City</th>
                  <th className={`${th} text-right`}>Upcoming</th>
                  <th className={th}>Added by</th>
                  <th className={th}>Status</th>
                  <th className="px-2 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-radar-purple/10">
                    <td className="max-w-72 px-4 py-2 md:px-2">
                      <span className="block font-extrabold break-words">
                        {v.name}
                      </span>
                      {v.name_ar && (
                        <span
                          dir="rtl"
                          lang="ar"
                          className="block text-xs text-radar-purple/70"
                        >
                          {v.name_ar}
                        </span>
                      )}
                      {v.address && (
                        <span className="block text-xs break-words text-radar-purple/70">
                          {v.address}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {flagOf(v.country_code)} {v.city}
                    </td>
                    <td className="px-2 py-2 text-right">{v.upcoming}</td>
                    <td className="max-w-40 px-2 py-2 text-xs break-words">
                      {v.added_by ?? "Comedy Radar"}
                    </td>
                    <td className="px-2 py-2">{contentStatusTag(v.status)}</td>
                    <td className="px-2 py-1">
                      <span className="flex items-center justify-end gap-1">
                        <StatusForm
                          kind="venue"
                          id={v.id}
                          status={v.status}
                          ret={ret}
                          name={v.name}
                        />
                        <Link
                          href={link({ ...base, edit: v.id })}
                          scroll={false}
                          className={iconBtn}
                          aria-label={`Edit ${v.name}`}
                          title="Edit the venue"
                        >
                          <EditIcon />
                        </Link>
                        {v.website && /^https?:\/\//.test(v.website) && (
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={`${iconBtn} text-xs font-extrabold`}
                            aria-label={`Website of ${v.name}`}
                            title="Open the website"
                          >
                            www
                          </a>
                        )}
                        {v.map_url && /^https?:\/\//.test(v.map_url) && (
                          <a
                            href={v.map_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={iconBtn}
                            aria-label={`Map for ${v.name}`}
                            title="Open the map"
                          >
                            <ExternalIcon />
                          </a>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const venueFields = [
  ["name", "Venue name", "", true, 120],
  ["address", "Address (optional)", "Street and area", false, 200],
  ["map_url", "Google Maps link", "https://maps.app.goo.gl/…", true, 500],
  ["website", "Website (optional)", "https://", false, 500],
  [
    "instagram",
    "Instagram (optional)",
    "@venue or instagram.com/venue",
    false,
    300,
  ],
  ["facebook", "Facebook (optional)", "facebook.com/venue", false, 300],
] as const;

/** Edit a venue's name, address and links. */
function VenueEditForm({
  v,
  ret,
  close,
}: {
  v: AdminVenueRow;
  ret: string;
  close: string;
}) {
  const value: Record<(typeof venueFields)[number][0], string> = {
    name: v.name,
    address: v.address ?? "",
    map_url: v.map_url ?? "",
    website: v.website ?? "",
    instagram: v.instagram_url ?? "",
    facebook: v.facebook_url ?? "",
  };
  return (
    <section
      aria-labelledby="venue-edit"
      className={`${card} flex flex-col gap-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="venue-edit" className="text-lg font-extrabold">
            Edit venue
          </h2>
          <p className="text-sm text-radar-purple/75">
            {flagOf(v.country_code)} {v.city} ·{" "}
            <Link href={`/venues/${v.slug}`} className="font-bold underline">
              See the public page
            </Link>
          </p>
        </div>
        <Link
          href={close}
          scroll={false}
          className={iconBtn}
          aria-label="Close without saving"
          title="Close"
        >
          <CloseIcon />
        </Link>
      </div>
      <form action={updateVenue} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={v.id} />
        <input type="hidden" name="ret" value={ret} />
        {venueFields.map(([name, label, ph, req, max]) => (
          <div key={name} className="flex flex-col gap-1">
            <label htmlFor={`ve-${name}`} className={labelCls}>
              {label}
            </label>
            <input
              id={`ve-${name}`}
              name={name}
              type={name === "map_url" || name === "website" ? "url" : "text"}
              required={req}
              maxLength={max}
              placeholder={ph || undefined}
              defaultValue={value[name]}
              className={`${inputCls} min-h-11`}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className={outlineBtn}>Save venue</button>
          <Link
            href={close}
            scroll={false}
            className="text-sm font-bold underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/admin/shows">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const tab = showTab(one(sp.tab));
  const msgKey = one(sp.msg);
  const msg = MSG[msgKey];
  const link = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    const all = { tab, ...over };
    for (const [k, v] of Object.entries(all))
      if (v && !(k === "tab" && v === "shows")) u.set(k, v);
    const qs = u.toString();
    return qs ? `/admin/shows?${qs}` : "/admin/shows";
  };
  const ctx: Ctx = { sp, tab, link };

  return (
    <>
      {msg && (
        <p
          role="status"
          className={`rounded-card px-4 py-3 font-extrabold ${msgKey === "saved" || msgKey === "declined" || msgKey === "venue_saved" ? "bg-spotlight-yellow" : "bg-laugh-pink"}`}
        >
          {msg}
        </p>
      )}
      <nav
        aria-label="Shows and tours tabs"
        className="-mx-1 flex gap-1 overflow-x-auto pb-1"
      >
        {SHOW_TABS.map((t) => {
          const active = t.value === tab;
          return (
            <Link
              key={t.value}
              href={
                t.value === "shows"
                  ? "/admin/shows"
                  : `/admin/shows?tab=${t.value}`
              }
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-button px-3 text-[15px] font-extrabold ${active ? "bg-stage-black text-white" : "bg-white hover:bg-lavender"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {tab === "shows" && <ShowsTab {...ctx} />}
      {tab === "tours" && <ToursTab {...ctx} />}
      {tab === "podcasts" && <PodcastsTab {...ctx} />}
      {tab === "venues" && <VenuesTab {...ctx} />}
    </>
  );
}

/** Admin Shows and tours (spec 11.5 item 4). */
export default function AdminShowsPage({
  searchParams,
}: PageProps<"/admin/shows">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">
        SHOWS AND TOURS
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
