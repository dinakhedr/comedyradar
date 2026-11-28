import type { Metadata } from "next";
import { TALL_GUIDE, WIDE_GUIDE } from "@/lib/posters";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  applyTourPoster,
  declineSignalRequest,
  quickEditTour,
  setContentStatus,
  setShowHomepage,
  setShowSignal,
  setShowStatus,
  setTicketLink,
} from "@/app/actions/admin-shows";
import { updateVenue } from "@/app/actions/admin-settings";
import { LogoPicker } from "@/components/admin/logo-picker";
import { CitiesFilter, ComedianFilter } from "@/components/admin/show-filters";
import { StatusSelect } from "@/components/admin/status-select";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import {
  card,
  outlineBtn,
  StatTile,
  Tag,
  yellowBtn,
} from "@/components/dashboard/ui";
import {
  ChevronDown,
  CloseIcon,
  CopyIcon,
  EditIcon,
  ExternalIcon,
  HomeIcon,
  StarIcon,
  SaveIcon,
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
  parseIdList,
  type ShowTab,
} from "@/lib/admin-shows";
import { flagOf } from "@/lib/countries";
import {
  getAdminPodcasts,
  getAdminShows,
  getAdminTours,
  getAdminVenues,
  type AdminShowRow,
  type AdminShows,
  type AdminTourRow,
  type AdminVenueRow,
} from "@/lib/data/admin";
import { formatShowDate } from "@/lib/dates";
import { UUID } from "@/lib/profile-server";
import { ErrorNote, SuccessNote } from "@/components/status-note";
import { ShowStatusPill, StatusPill } from "@/components/status";
import { SubmitButton } from "@/components/submit-button";
import { LinkPending } from "@/components/link-pending";
import { AddNewLink } from "@/components/admin/add-new-link";
import { CoverImage } from "@/components/placeholder-image";

export const metadata: Metadata = { title: "Shows and tours" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, string> = {
  saved: "Saved.",
  created: "Added.",
  tour_some_failed: "The tour was added, but some dates could not be saved. Open the tour to check its dates.",
  tour_dates_failed: "The tour was saved, but some new dates could not be saved. Open the tour to check its dates.",
  declined: "Signal change request declined. The signal stays as it is.",
  none_picked: "Tick at least one show first.",
  bad_url: "That ticket link is not a web link. It must start with https://",
  home_on: "Done. The show is back on the homepage.",
  home_off: "Done. The show is off the homepage. It still shows on the Shows page.",
  venue_saved: "Venue saved.",
  tour_saved: "Tour saved. Its dates use the new name and posters.",
  dates_added: "Done. The new dates are on the tour.",
  tour_poster: "Done. The ticked dates now show the tour poster.",
  tour_bad_name: "Please give the tour a name (up to 120 characters).",
  tour_bad_poster: "The poster must be a JPG, PNG or WebP image, up to 10 MB.",
  tour_poster_failed: "The poster did not upload. Please try again.",
  venue_bad_logo: "The logo must be a JPG, PNG or WebP image. Please pick another file.",
  venue_logo_failed: "The venue was saved, but the logo did not upload. Please try the logo again.",
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

function showStatusTag(s: string) {
  return <ShowStatusPill status={s} />;
}
function contentStatusTag(s: string) {
  return <StatusPill status={s} label={labelOf(CONTENT_STATUSES, s)} />;
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

/** A status menu for tours, podcasts and venues: it saves when a new status is picked. */
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
    <StatusSelect
      action={setContentStatus}
      hidden={{ ret, kind, id }}
      id={`st-${id}`}
      name={name}
      status={status}
      options={CONTENT_STATUSES}
    />
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
        <Link
          href={`/admin/shows/${s.id}/edit`}
          className={iconBtn}
          aria-label="Edit all details"
          title="Edit all details"
        >
          <LinkPending><EditIcon /></LinkPending>
        </Link>
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
            <SubmitButton
              className={`${yellowBtn} h-11 w-11 shrink-0 px-0!`}
              aria-label="Save status"
              title="Save status"
            >
              <SaveIcon />
            </SubmitButton>
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
              <SubmitButton className={yellowBtn}>Set</SubmitButton>
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
              <SubmitButton className={`${outlineBtn} w-full`}>
                Decline the request
              </SubmitButton>
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
            <SubmitButton className={`${outlineBtn} ml-auto`}>Save link</SubmitButton>
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

/** The numbers and the "Data quality and signal rules" box (closed until clicked). */
function Overview({ data, link }: { data: AdminShows; link: Ctx["link"] }) {
  const { stats, quality } = data;
  const toCheck = quality.signal_requests + quality.no_venue + quality.tours_no_tickets;
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

      <details className="group rounded-card bg-white">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 md:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-extrabold">Data quality and signal rules</span>{" "}
            <span className="ml-1 text-sm font-bold whitespace-nowrap text-radar-purple/70">
              {toCheck === 1 ? "1 thing to check" : `${toCheck} things to check`}
            </span>
          </span>
          <ChevronDown size={20} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4 md:px-6 md:pb-6">
          <ul className="flex flex-wrap gap-2 text-sm">
            <li>
              <Link
                href={link({ tab: "shows", status: "asked", period: "all" })}
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
        </div>
      </details>
    </>
  );
}

/** "With the ticked shows": signal, unpublish and (tour dates) use the tour poster. */
function BulkBar({ id, ret, tour }: { id: string; ret: string; tour?: boolean }) {
  return (
    <form
      id={id}
      className="flex flex-wrap items-center gap-2 rounded-button bg-lavender p-2"
    >
      <Hidden ret={ret} />
      <span className="px-1 text-sm font-extrabold">
        With the ticked {tour ? "dates" : "shows"}:
      </span>
      <label htmlFor={`${id}-signal`} className="sr-only">
        Signal for the ticked {tour ? "dates" : "shows"}
      </label>
      <select
        id={`${id}-signal`}
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
      <SubmitButton formAction={setShowSignal} name="bulk" value="signal" className={smallBtn}>
        Set signal
      </SubmitButton>
      {tour && (
        <SubmitButton formAction={applyTourPoster} name="bulk" value="poster" className={smallBtn}>
          Use tour poster
        </SubmitButton>
      )}
      <SubmitButton
        formAction={setShowStatus}
        name="status"
        value="draft"
        className={smallBtn}
      >
        Unpublish
      </SubmitButton>
    </form>
  );
}

/** The shows table: Single shows tab, and each tour's dates in the Tours tab. */
function DatesTable({
  rows,
  ret,
  here,
  pickedId,
  bulkId,
  tour,
}: {
  rows: AdminShowRow[];
  ret: string;
  here: (over?: Record<string, string>) => string;
  pickedId?: string;
  bulkId: string;
  tour?: boolean;
}) {
  return (
    <div className="relative -mx-4 overflow-x-auto md:mx-0">
      <table className={`w-full ${tour ? "min-w-[900px]" : "min-w-[960px]"} text-left text-sm`}>
        <thead>
          <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
            <th className="w-10 px-4 py-2 md:px-2">
              <span className="sr-only">Tick</span>
            </th>
            {tour && <th className={th}>Poster</th>}
            <th className={th}>Date</th>
            <th className={th}>Show</th>
            <th className={th}>Status</th>
            <th className={th}>Signal</th>
            <th className={th}>Tickets</th>
            {!tour && <th className={th}>Added by</th>}
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
            const [date, time] = formatShowDate(new Date(r.starts_at)).split(" · ");
            return (
              <tr
                key={r.id}
                className={`border-b border-radar-purple/10 align-top ${pickedId === r.id ? "bg-lavender" : ""} ${tour && !isFuture(r.starts_at) ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-3 md:px-2">
                  <input
                    type="checkbox"
                    name="ids"
                    value={r.id}
                    form={bulkId}
                    aria-label={`Tick ${r.title}, ${date}`}
                    className="mt-1 h-5 w-5 accent-radar-purple"
                  />
                </td>
                {tour && (
                  <td className="px-2 py-3">
                    <CoverImage
                      src={r.poster_url ?? r.tour_poster_url}
                      alt=""
                      iconSize={18}
                      tone="purple"
                      className="h-[55px] w-11 rounded-lg"
                    />
                    <span
                      className={`mt-1 block text-[11px] font-extrabold whitespace-nowrap ${r.poster_url ? "text-laugh-pink-deep" : "text-radar-purple/70"}`}
                    >
                      {r.poster_url ? "Own poster" : "Tour poster"}
                    </span>
                  </td>
                )}
                <td className="px-2 py-3 whitespace-nowrap">
                  <span className="font-bold">{date}</span>
                  <span className="block text-xs text-radar-purple/70">{time}</span>
                </td>
                <td className="max-w-72 px-2 py-3">
                  <Link
                    href={here({ s: r.id })}
                    className="font-extrabold break-words hover:underline"
                  >
                    {r.title}
                  </Link>
                  {r.performers && !tour && (
                    <span className="block text-xs font-bold break-words">
                      {r.performers}
                    </span>
                  )}
                  <span className="block text-xs break-words text-radar-purple/70">
                    {[r.venue, `${flagOf(r.country_code)} ${r.city}`, labelOf(ZONES, r.zone)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </td>
                <td className="px-2 py-3">{showStatusTag(r.status)}</td>
                <td className="px-2 py-2">
                  <form action={setShowSignal} className="flex items-center gap-1">
                    <Hidden ret={ret} more={{ ids: r.id }} />
                    <label htmlFor={`sig-${r.id}`} className="sr-only">
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
                    <SubmitButton className={smallBtn}>Set</SubmitButton>
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
                {!tour && (
                  <td className="max-w-40 px-2 py-3 text-xs break-words">
                    {r.added_by ?? "Unknown"}
                  </td>
                )}
                <td className="px-2 py-1">
                  <span className="flex justify-end">
                    {(r.status === "published" || r.status === "sold_out") && (
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
                    {r.status === "published" && isFuture(r.starts_at) && (
                      <Link
                        href={`/admin/spotlight?show=${r.id}#new`}
                        className={iconBtn}
                        aria-label={`Add ${r.title} to the Spotlight`}
                        title="Add to the Spotlight"
                      >
                        <StarIcon />
                      </Link>
                    )}
                    <form action={setShowHomepage}>
                      <Hidden ret={ret} more={{ id: r.id, on: r.on_homepage === false ? "1" : "0" }} />
                      <SubmitButton
                        className={iconBtn}
                        aria-label={
                          r.on_homepage === false
                            ? `Put ${r.title} on the homepage`
                            : `Take ${r.title} off the homepage`
                        }
                        title={
                          r.on_homepage === false
                            ? "Not on the homepage. Click to put it in Coming up"
                            : "On the homepage (Coming up). Click to take it off"
                        }
                      >
                        <HomeIcon filled={r.on_homepage !== false} />
                      </SubmitButton>
                    </form>
                    <Link
                      href={`/admin/shows/${r.id}/edit`}
                      className={iconBtn}
                      aria-label={`Edit ${r.title}`}
                      title="Edit all details"
                    >
                      <LinkPending><EditIcon /></LinkPending>
                    </Link>
                    <Link
                      href={`/admin/shows/new?from=${r.id}`}
                      className={iconBtn}
                      aria-label={`Duplicate ${r.title}`}
                      title="Duplicate: a new show with the same details"
                    >
                      <LinkPending><CopyIcon /></LinkPending>
                    </Link>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ShowsTab({ sp, link }: Ctx) {
  const q = one(sp.q).slice(0, 80);
  const comedian = UUID.test(one(sp.comedian)) ? one(sp.comedian).toLowerCase() : "";
  const status = showStatusOf(one(sp.status));
  const period = periodOf(one(sp.period));
  const cities = parseIdList(one(sp.cities));
  // Signal change requests can be on tour dates too, so that filter shows both.
  const data = await getAdminShows({ q, comedian, status, cities, period, kind: status === "asked" ? "" : "single" });
  const rows = data.rows;
  const filters = {
    q,
    comedian,
    status,
    cities: cities.join(","),
    period: period === "upcoming" ? "" : period,
  };
  const here = (over: Record<string, string> = {}) =>
    link({ ...filters, ...over });
  const picked = rows.find((r) => r.id === one(sp.s)) ?? null;
  const ret = here(picked ? { s: picked.id } : {});
  const filtered = q || comedian || status || cities.length > 0 || period !== "upcoming";
  const onTours = data.stats.on_tours ?? 0;

  return (
    <>
      <Overview data={data} link={link} />

      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${picked ? "2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:items-start" : ""}`}
      >
        <section
          aria-labelledby="list"
          className={`${card} flex min-w-0 flex-col gap-4`}
        >
          <h2 id="list" className="sr-only">
            Single shows
          </h2>
          <form
            method="get"
            action="/admin/shows"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto] xl:gap-2.5"
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
              <label htmlFor="as-comedian" className={labelCls}>
                Comedian
              </label>
              <ComedianFilter
                // Remount when the URL changes, so Clear filters resets it.
                key={comedian}
                id="as-comedian"
                comedians={data.comedians ?? []}
                value={comedian}
              />
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
              <label htmlFor="as-cities" className={labelCls}>
                Cities
              </label>
              <CitiesFilter
                key={cities.join(",")}
                id="as-cities"
                cities={data.cities}
                value={cities}
              />
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
              <Link
                href={link({})}
                className="inline-flex min-h-11 items-center gap-1.5 px-2 font-extrabold whitespace-nowrap underline"
              >
                <span aria-hidden="true">✕</span> Clear filters
              </Link>
            </div>
          </form>

          {rows.length === 0 ? (
            <p className="text-radar-purple/80">
              {filtered
                ? "No shows match these filters."
                : "No upcoming single shows yet."}
            </p>
          ) : (
            <>
              <BulkBar id="bulk" ret={ret} />
              <DatesTable rows={rows} ret={ret} here={here} pickedId={picked?.id} bulkId="bulk" />
              {rows.length >= 500 && (
                <p className="text-sm text-radar-purple/75">
                  Showing the first 500. Use the filters to narrow the list.
                </p>
              )}
            </>
          )}
          {status !== "asked" && onTours > 0 && (
            <p className="text-sm text-radar-purple/75">
              {onTours === 1 ? "1 upcoming tour date is" : `${onTours} upcoming tour dates are`} in the{" "}
              <Link href={link({ tab: "tours" })} className="font-extrabold underline">
                Tours tab
              </Link>
              .
            </p>
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

const shortDay = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Africa/Cairo",
      })
    : "";

/** One tour in the Tours tab: its poster and name, a quick edit, and its dates. */
function TourBox({
  t,
  dates,
  open,
  editing,
  ret,
  here,
  pickedId,
}: {
  t: AdminTourRow;
  dates: AdminShowRow[];
  open: boolean;
  editing: boolean;
  ret: string;
  here: (over?: Record<string, string>) => string;
  pickedId?: string;
}) {
  const cities = [...new Set(dates.map((d) => d.city))].join(", ");
  const own = dates.filter((d) => d.poster_url).length;
  const count = dates.length === 1 ? "1 date" : `${dates.length} dates`;
  return (
    <li id={`tour-${t.id}`} className="scroll-mt-6 overflow-hidden rounded-card border-2 border-radar-purple/10">
      <div className="flex flex-wrap items-center gap-3 bg-lavender/50 p-3 md:gap-4 md:p-4">
        <CoverImage
          src={t.poster_url}
          alt=""
          iconSize={22}
          tone="purple"
          className="h-20 w-16 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold break-words">{t.name}</h3>
          <p className="text-sm text-radar-purple/75">
            <strong>{t.owner ?? "Unknown"}</strong> · {count}
            {t.first_at ? ` · ${shortDay(t.first_at)} – ${shortDay(t.last_at)}` : ""}
            {cities ? ` · ${cities}` : ""}
          </p>
        </div>
        <span className="flex items-center gap-1">
          <StatusForm kind="tour" id={t.id} status={t.status} ret={ret} name={t.name} />
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
          {editing ? (
            <Link href={`${here()}#tour-${t.id}`} className={iconBtn} aria-label="Close the quick edit" title="Close">
              <CloseIcon size={20} />
            </Link>
          ) : (
            <Link
              href={`${here({ edit: t.id })}#tour-${t.id}`}
              className={iconBtn}
              aria-label={`Change the name or poster of ${t.name}`}
              title="Change the tour name or poster"
            >
              <LinkPending><EditIcon /></LinkPending>
            </Link>
          )}
        </span>
      </div>

      {editing && (
        <form
          action={quickEditTour}
          className="flex flex-wrap items-end gap-3 border-t border-radar-purple/10 p-3 md:p-4"
        >
          <Hidden ret={`${here()}#tour-${t.id}`} more={{ id: t.id }} />
          <div className="flex min-w-60 flex-1 flex-col gap-1">
            <label htmlFor={`tn-${t.id}`} className={labelCls}>
              Tour name
            </label>
            <input
              id={`tn-${t.id}`}
              name="name"
              required
              maxLength={120}
              defaultValue={t.name}
              className={`${inputCls} min-h-11`}
            />
          </div>
          {(
            [
              ["poster", "tp", "New wide poster", WIDE_GUIDE],
              ["poster_tall", "tt", "New tall poster", TALL_GUIDE],
            ] as const
          ).map(([field, pre, label, guide]) => (
            <div key={field} className="flex flex-col gap-1">
              <label htmlFor={`${pre}-${t.id}`} className={labelCls}>
                {label} <span className="font-bold text-radar-purple/60">(optional)</span>
              </label>
              <input
                id={`${pre}-${t.id}`}
                name={field}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby={`${pre}-g-${t.id}`}
                className="min-h-11 text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-3 file:font-extrabold file:text-radar-purple"
              />
              <span id={`${pre}-g-${t.id}`} className="text-[12px] text-radar-purple/70">
                {guide}
              </span>
            </div>
          ))}
          <SubmitButton
            className={`${yellowBtn} h-11 w-11 shrink-0 px-0!`}
            aria-label="Save the tour name and posters"
            title="Save"
          >
            <SaveIcon />
          </SubmitButton>
          <p className="basis-full text-sm text-radar-purple/75">
            The name and posters go on all {count} at once.{" "}
            {own > 0
              ? `${own === 1 ? "1 date has" : `${own} dates have`} their own poster and keep it.`
              : "A date with its own poster keeps it."}{" "}
            <Link href={`/admin/shows/tours/${t.id}/edit`} className="font-extrabold underline">
              Edit dates, prices and more
            </Link>
          </p>
        </form>
      )}

      <details open={open} className="group border-t border-radar-purple/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-extrabold md:px-4 [&::-webkit-details-marker]:hidden">
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
          {dates.length ? `${count} on this tour` : "No dates yet"}
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3 md:px-4 md:pb-4">
          {dates.length > 0 && (
            <>
              <BulkBar id={`bulk-${t.id}`} ret={ret} tour />
              <DatesTable rows={dates} ret={ret} here={here} pickedId={pickedId} bulkId={`bulk-${t.id}`} tour />
            </>
          )}
          <Link
            href={`/admin/shows/tours/${t.id}/edit?add=1`}
            className={`${smallBtn} self-start`}
            aria-label={`Add a date to ${t.name}`}
          >
            <LinkPending>+ Add a date</LinkPending>
          </Link>
        </div>
      </details>
    </li>
  );
}

async function ToursTab({ sp, link }: Ctx) {
  const q = one(sp.q).slice(0, 80);
  const status = contentStatusOf(one(sp.status));
  const editId = one(sp.edit);
  const [tours, data] = await Promise.all([
    getAdminTours(q, status),
    getAdminShows({ q: "", comedian: "", status: "", cities: [], period: "all", kind: "tour" }),
  ]);
  const byTour = new Map<string, AdminShowRow[]>();
  for (const r of data.rows) {
    if (!r.tour_id) continue;
    const list = byTour.get(r.tour_id) ?? [];
    list.push(r);
    byTour.set(r.tour_id, list);
  }
  const here = (over: Record<string, string> = {}) =>
    link({ tab: "tours", q, status, ...over });
  const picked = data.rows.find((r) => r.id === one(sp.s)) ?? null;
  const ret = here(picked ? { s: picked.id } : {});

  return (
    <>
      <Overview data={data} link={link} />
      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-6 ${picked ? "2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:items-start" : ""}`}
      >
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
          {tours.length === 0 ? (
            <p className="text-radar-purple/80">
              {q || status ? "No tours match these filters." : "No tours yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {tours.map((t, i) => {
                const dates = byTour.get(t.id) ?? [];
                return (
                  <TourBox
                    key={t.id}
                    t={t}
                    dates={dates}
                    open={i === 0 || t.id === editId || dates.some((d) => d.id === picked?.id)}
                    editing={t.id === editId}
                    ret={ret}
                    here={here}
                    pickedId={picked?.id}
                  />
                );
              })}
            </ul>
          )}
        </section>
        {picked && (
          <ShowPanel key={picked.id} s={picked} ret={ret} close={here()} />
        )}
      </div>
    </>
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
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                  <th className="px-4 py-2 font-extrabold md:px-2">Venue</th>
                  <th className={th}>Country</th>
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
                      {flagOf(v.country_code)} {v.country_name}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{v.city}</td>
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
                          <LinkPending><EditIcon /></LinkPending>
                        </Link>

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
  ["area", "Area (optional)", "e.g. Sheikh Zayed, New Cairo", false, 60],
  ["address", "Address (optional)", "Street and building", false, 200],
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
    area: v.area ?? "",
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
        <LogoPicker id={`ve-${v.id}`} current={v.logo_url} name={v.name} />
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
          <SubmitButton className={outlineBtn}>Save venue</SubmitButton>
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
        ["saved", "created", "declined", "venue_saved", "tour_saved", "tour_poster", "dates_added"].includes(msgKey) ? (
          <SuccessNote>{msg}</SuccessNote>
        ) : (
          <ErrorNote>{msg}</ErrorNote>
        )
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] leading-none md:text-[44px]">
          SHOWS AND TOURS
        </h1>
        <div className="flex flex-wrap gap-2">
          <AddNewLink href="/admin/shows/new">Add new show</AddNewLink>
          <AddNewLink href="/admin/shows/new-tour" outline>
            Add new tour
          </AddNewLink>
        </div>
      </div>
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
