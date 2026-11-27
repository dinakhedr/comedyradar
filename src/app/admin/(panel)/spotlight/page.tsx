import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  endPlacement,
  movePlacement,
  saveCarouselSettings,
  savePlacement,
} from "@/app/actions/admin-spotlight";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import {
  card,
  outlineBtn,
  StatTile,
  Tag,
  yellowBtn,
} from "@/components/dashboard/ui";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  EditIcon,
  ExternalIcon,
} from "@/components/icons";
import { CURRENCIES, isoToCairoInput } from "@/lib/admin-spotlight";
import {
  getAdminSpotlight,
  getSpotlightShowOptions,
  type AdminPlacement,
} from "@/lib/data/admin";
import { getSpotlight } from "@/lib/data/home";
import { formatShowDate } from "@/lib/dates";
import { UUID } from "@/lib/profile-server";
import { ErrorNote, SuccessNote } from "@/components/status-note";
import { SubmitButton } from "@/components/submit-button";
import { LinkPending } from "@/components/link-pending";

export const metadata: Metadata = { title: "Spotlight" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, [string, boolean]> = {
  saved: ["Placement saved. The homepage updates within a few minutes.", true],
  ended: ["Placement ended.", true],
  removed: ["Scheduled placement removed.", true],
  moved: ["Order changed.", true],
  settings: ["Carousel settings saved.", true],
  bad_dates: [
    "Check the dates: the placement must end after it starts, and before the show starts.",
    false,
  ],
  no_show: ["Choose an upcoming published show first.", false],
  error: ["Something went wrong. Please try again.", false],
};
const iconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button text-radar-purple hover:bg-lavender disabled:opacity-30";
const th = "px-2 py-2 font-extrabold whitespace-nowrap";
const short = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
const money = (n: number | null, c: string) =>
  n == null ? "" : `${c} ${Number(n).toLocaleString("en-GB")}`;

function TypeTag({ paid }: { paid: boolean }) {
  return paid ? <Tag tone="pink">Paid</Tag> : <Tag tone="yellow">Free</Tag>;
}
function StateTag({ s }: { s: AdminPlacement["state"] }) {
  if (s === "live") return <Tag tone="purple">Live</Tag>;
  if (s === "scheduled") return <Tag tone="outline">Scheduled</Tag>;
  return <span className="text-xs text-radar-purple/60">Ended</span>;
}

async function LiveNow({
  live,
  slides,
}: {
  live: AdminPlacement[];
  slides: number;
}) {
  const carousel = await getSpotlight(slides);
  const byShow = new Map(live.map((p) => [p.show_id, p]));
  const order = live.map((p) => p.id);
  return (
    <section aria-labelledby="live" className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="live" className="text-heading font-extrabold">
          Live now
        </h2>
        <p className="text-sm text-radar-purple/75">
          The homepage carousel, in order. Move placements up or down to change
          their priority.
        </p>
      </div>
      {carousel.length === 0 ? (
        <p className="text-radar-purple/80">
          Nothing picked yet, so the homepage has no Spotlight section. Add
          a placement below to show it.
        </p>
      ) : (
        <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 xl:grid-cols-5">
          {carousel.map((s, i) => {
            const p =
              s.source === "placement" ? byShow.get(s.show.id) : undefined;
            const at = p ? order.indexOf(p.id) : -1;
            return (
              <li
                key={s.show.id}
                className="flex w-64 shrink-0 snap-start flex-col gap-2 rounded-button border-2 border-radar-purple/15 p-3 md:w-auto"
              >
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-stage-black text-xs font-extrabold text-white">
                    {i + 1}
                  </span>
                  {p ? (
                    <TypeTag paid={p.is_paid} />
                  ) : (
                    <Tag tone="outline">Picked</Tag>
                  )}
                </p>
                <p className="font-extrabold break-words">{s.show.title}</p>
                <p className="text-xs text-radar-purple/75">
                  {formatShowDate(new Date(s.show.starts_at))} ·{" "}
                  {s.show.city_name}
                </p>
                {p ? (
                  <>
                    <p className="text-xs text-radar-purple/75">
                      Ends {short(p.ends_at)} · {p.impressions} views ·{" "}
                      {p.clicks} clicks
                    </p>
                    <div className="mt-auto flex items-center gap-1">
                      <form action={movePlacement}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="dir" value="up" />
                        <SubmitButton
                          className={iconBtn}
                          disabled={at <= 0}
                          aria-label={`Move ${s.show.title} earlier`}
                          title="Move earlier"
                        >
                          <ArrowUpIcon />
                        </SubmitButton>
                      </form>
                      <form action={movePlacement}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="dir" value="down" />
                        <SubmitButton
                          className={iconBtn}
                          disabled={at < 0 || at >= order.length - 1}
                          aria-label={`Move ${s.show.title} later`}
                          title="Move later"
                        >
                          <ArrowDownIcon />
                        </SubmitButton>
                      </form>
                      <Link
                        href={`/admin/spotlight?edit=${p.id}#new`}
                        className={iconBtn}
                        aria-label={`Edit the placement of ${s.show.title}`}
                        title="Edit"
                      >
                        <LinkPending><EditIcon /></LinkPending>
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="mt-auto text-xs text-radar-purple/75">
                    Placement details not found
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

async function PlacementForm({
  edit,
  showId,
  find,
  placements,
}: {
  edit: AdminPlacement | null;
  showId: string;
  find: string;
  placements: AdminPlacement[];
}) {
  const chosenId = edit?.show_id ?? showId;
  const options = await getSpotlightShowOptions(chosenId && !find ? "" : find);
  const chosen = edit
    ? {
        id: edit.show_id,
        title: edit.title,
        starts_at: edit.show_at,
        city: edit.city,
      }
    : (options.find((o) => o.id === chosenId) ?? null);
  const already = chosen
    ? placements.filter(
        (p) =>
          p.show_id === chosen.id && p.state !== "ended" && p.id !== edit?.id,
      ).length
    : 0;

  return (
    <section
      id="new"
      aria-labelledby="new-title"
      className={`${card} flex scroll-mt-6 flex-col gap-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="new-title" className="text-heading font-extrabold">
          {edit ? "Edit placement" : "New placement"}
        </h2>
        {(edit || chosen) && (
          <Link
            href="/admin/spotlight#new"
            className={iconBtn}
            aria-label="Start again"
            title="Start again"
          >
            <CloseIcon size={20} />
          </Link>
        )}
      </div>

      {!chosen ? (
        <div className="flex flex-col gap-3">
          <form
            method="get"
            action="/admin/spotlight#new"
            className="flex items-end gap-2"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="sp-find" className={labelCls}>
                Find a show
              </label>
              <input
                id="sp-find"
                name="find"
                defaultValue={find}
                placeholder="Show title"
                className={`${inputCls} min-h-11`}
              />
            </div>
            <button className={outlineBtn}>Search</button>
          </form>
          {options.length === 0 ? (
            <p className="text-sm text-radar-purple/75">
              No upcoming published shows match.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-radar-purple/10">
              {options.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold break-words">
                      {o.title}
                    </span>
                    <span className="block text-xs text-radar-purple/70">
                      {formatShowDate(new Date(o.starts_at))} · {o.city}
                    </span>
                  </span>
                  <Link
                    href={`/admin/spotlight?show=${o.id}#new`}
                    className={`${outlineBtn} min-h-11 px-3 text-sm`}
                  >
                    Choose
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-radar-purple/70">
            Only upcoming published shows can go in the Spotlight. The next 20
            are listed.
          </p>
        </div>
      ) : (
        <form action={savePlacement} className="flex flex-col gap-4">
          {edit && <input type="hidden" name="id" value={edit.id} />}
          <input type="hidden" name="show_id" value={chosen.id} />
          <div className="rounded-button bg-lavender p-3">
            <p className="font-extrabold break-words">{chosen.title}</p>
            <p className="text-sm text-radar-purple/75">
              {formatShowDate(new Date(chosen.starts_at))} · {chosen.city}
            </p>
            {already > 0 && (
              <p className="mt-1 text-sm font-bold text-laugh-pink-deep">
                This show already has a live or scheduled placement.
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-start" className={labelCls}>
                Start (Cairo time)
              </label>
              <input
                id="sp-start"
                name="starts_at"
                type="datetime-local"
                defaultValue={isoToCairoInput(edit?.starts_at)}
                className={`${inputCls} min-h-11`}
              />
              <p className="text-xs text-radar-purple/70">Empty = now.</p>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-end" className={labelCls}>
                End (Cairo time)
              </label>
              <input
                id="sp-end"
                name="ends_at"
                type="datetime-local"
                defaultValue={isoToCairoInput(edit?.ends_at)}
                className={`${inputCls} min-h-11`}
              />
              <p className="text-xs text-radar-purple/70">
                Empty = when the show starts. It never runs past the show start.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-priority" className={labelCls}>
                Priority
              </label>
              <input
                id="sp-priority"
                name="priority"
                type="number"
                min={0}
                max={1000}
                defaultValue={edit?.priority ?? 10}
                className={`${inputCls} min-h-11`}
              />
              <p className="text-xs text-radar-purple/70">
                Higher shows first.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-slide" className={labelCls}>
                Preferred slide
              </label>
              <select
                id="sp-slide"
                name="preferred_slide"
                defaultValue={edit?.preferred_slide?.toString() ?? ""}
                className={`${inputCls} min-h-11`}
              >
                <option value="">Any free slide</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Slide {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <fieldset className="flex flex-col gap-3 rounded-button border-2 border-radar-purple/15 p-3">
            <legend className="px-1 text-sm font-extrabold">Payment</legend>
            <label className="flex min-h-11 items-center gap-3 font-bold">
              <input
                type="checkbox"
                name="is_paid"
                value="yes"
                defaultChecked={edit?.is_paid ?? false}
                className="h-5 w-5 accent-radar-purple"
              />
              Paid placement
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-1">
                <label htmlFor="sp-amount" className={labelCls}>
                  Amount
                </label>
                <input
                  id="sp-amount"
                  name="amount"
                  inputMode="decimal"
                  defaultValue={edit?.amount ?? ""}
                  className={`${inputCls} min-h-11`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="sp-currency" className={labelCls}>
                  Currency
                </label>
                <select
                  id="sp-currency"
                  name="currency"
                  defaultValue={edit?.currency ?? "EGP"}
                  className={`${inputCls} min-h-11`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sp-client" className={labelCls}>
                Client
              </label>
              <input
                id="sp-client"
                name="client"
                maxLength={120}
                defaultValue={edit?.client_name ?? ""}
                placeholder="Promoter or comedian"
                className={`${inputCls} min-h-11`}
              />
            </div>
            <p className="text-xs text-radar-purple/70">
              Placements are free at launch. Amounts are kept for reports later.
            </p>
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor="sp-notes" className={labelCls}>
              Notes (only you see these)
            </label>
            <textarea
              id="sp-notes"
              name="notes"
              rows={2}
              maxLength={500}
              defaultValue={edit?.notes ?? ""}
              className={inputCls}
            />
          </div>
          <SubmitButton className={`${yellowBtn} self-start px-6`}>
            {edit ? "Save placement" : "Add to the Spotlight"}
          </SubmitButton>
        </form>
      )}
    </section>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/admin/spotlight">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const data = await getAdminSpotlight();
  const msg = MSG[one(sp.msg)];
  const edit =
    data.placements.find((p) => p.id === one(sp.edit) && p.state !== "ended") ??
    null;
  const showId = UUID.test(one(sp.show)) ? one(sp.show) : "";
  const find = one(sp.find).slice(0, 80);

  return (
    <>
      {msg && (
        msg[1] ? (
          <SuccessNote>{msg[0]}</SuccessNote>
        ) : (
          <ErrorNote>{msg[0]}</ErrorNote>
        )
      )}
      <section
        aria-label="Numbers"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5"
      >
        <StatTile label="Live placements" value={data.stats.live} />
        <StatTile label="Scheduled" value={data.stats.scheduled} />
        <StatTile label="Views" value={data.stats.views} note="Last 30 days" />
        <StatTile
          label="Ticket clicks"
          value={data.stats.clicks}
          note="Last 30 days"
        />
        <StatTile
          label="Revenue (EGP)"
          value={data.stats.revenue}
          note="Free at launch"
        />
      </section>

      <LiveNow live={data.live} slides={data.settings.slides} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <section
          aria-labelledby="all"
          className={`${card} flex min-w-0 flex-col gap-4`}
        >
          <h2 id="all" className="text-heading font-extrabold">
            All placements
          </h2>
          {data.placements.length === 0 ? (
            <p className="text-radar-purple/80">
              No placements yet. The homepage shows a Spotlight only when you
              add one here.
            </p>
          ) : (
            <div className="relative -mx-4 overflow-x-auto md:mx-0">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
                    <th className="px-4 py-2 font-extrabold md:px-2">Show</th>
                    <th className={th}>Dates</th>
                    <th className={`${th} text-right`}>Priority</th>
                    <th className={th}>Type</th>
                    <th className={th}>Client</th>
                    <th className={`${th} text-right`}>Views / clicks</th>
                    <th className={th}>Status</th>
                    <th className="px-2 py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.placements.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b border-radar-purple/10 align-top ${edit?.id === p.id ? "bg-lavender" : ""}`}
                    >
                      <td className="max-w-64 px-4 py-2 md:px-2">
                        <span className="block font-extrabold break-words">
                          {p.title}
                        </span>
                        <span className="block text-xs text-radar-purple/70">
                          {formatShowDate(new Date(p.show_at))} · {p.city}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap">
                        {short(p.starts_at)}
                        <span className="block">to {short(p.ends_at)}</span>
                      </td>
                      <td className="px-2 py-2 text-right">{p.priority}</td>
                      <td className="px-2 py-2">
                        <TypeTag paid={p.is_paid} />
                        {p.is_paid && p.amount != null && (
                          <span className="block text-xs">
                            {money(p.amount, p.currency)}
                          </span>
                        )}
                      </td>
                      <td className="max-w-40 px-2 py-2 text-xs break-words">
                        {p.client_name ?? ""}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        {p.impressions} / {p.clicks}
                      </td>
                      <td className="px-2 py-2">
                        <StateTag s={p.state} />
                      </td>
                      <td className="px-2 py-1">
                        <span className="flex justify-end">
                          <a
                            href={`/shows/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={iconBtn}
                            aria-label={`Open ${p.title}`}
                            title="Open the show page"
                          >
                            <ExternalIcon />
                          </a>
                          {p.state !== "ended" && (
                            <>
                              <Link
                                href={`/admin/spotlight?edit=${p.id}#new`}
                                className={iconBtn}
                                aria-label={`Edit the placement of ${p.title}`}
                                title="Edit"
                              >
                                <LinkPending><EditIcon /></LinkPending>
                              </Link>
                              <form action={endPlacement}>
                                <input type="hidden" name="id" value={p.id} />
                                <SubmitButton
                                  className={iconBtn}
                                  aria-label={`${p.state === "live" ? "End" : "Remove"} the placement of ${p.title}`}
                                  title={
                                    p.state === "live" ? "End now" : "Remove"
                                  }
                                >
                                  <CloseIcon size={20} />
                                </SubmitButton>
                              </form>
                            </>
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

        <div className="flex min-w-0 flex-col gap-6">
          <PlacementForm
            key={edit?.id ?? showId ?? "new"}
            edit={edit}
            showId={showId}
            find={find}
            placements={data.placements}
          />

          <section
            aria-labelledby="settings"
            className={`${card} flex flex-col gap-4`}
          >
            <h2 id="settings" className="text-heading font-extrabold">
              Carousel settings
            </h2>
            <form action={saveCarouselSettings} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="cs-slides" className={labelCls}>
                    Slides
                  </label>
                  <select
                    id="cs-slides"
                    name="slides"
                    defaultValue={String(data.settings.slides)}
                    className={`${inputCls} min-h-11`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cs-seconds" className={labelCls}>
                    Auto-advance (seconds)
                  </label>
                  <input
                    id="cs-seconds"
                    name="seconds"
                    type="number"
                    min={3}
                    max={20}
                    defaultValue={data.settings.seconds}
                    className={`${inputCls} min-h-11`}
                  />
                </div>
              </div>
              <p className="text-sm text-radar-purple/80">
                Only the shows you add here appear in the Spotlight. Empty
                slides stay empty, and with no placements the homepage hides
                the Spotlight.
              </p>
              <SubmitButton className={`${outlineBtn} self-start`}>
                Save settings
              </SubmitButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

/** Admin Spotlight (spec 11.5 item 6). */
export default function AdminSpotlightPage({
  searchParams,
}: PageProps<"/admin/spotlight">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">
        SPOTLIGHT
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
