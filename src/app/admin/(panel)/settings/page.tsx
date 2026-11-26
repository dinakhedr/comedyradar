import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { addCity, addVenue, saveSettings } from "@/app/actions/admin-settings";
import { setContentStatus } from "@/app/actions/admin-shows";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, Tag, yellowBtn } from "@/components/dashboard/ui";
import { flagOf } from "@/lib/countries";
import { EditIcon, SaveIcon } from "@/components/icons";
import { CONTENT_STATUSES, labelOf } from "@/lib/admin-shows";
import {
  getAdminSettings,
  getAdminVenues,
  type AdminSettings,
  type AdminVenueRow,
} from "@/lib/data/admin";

export const metadata: Metadata = { title: "Settings" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, [string, boolean]> = {
  saved: ["Settings saved. The website updates within a few minutes.", true],
  city_added: ["City added.", true],
  city_exists: ["That city is already in the list.", false],
  venue_added: ["Venue added and published.", true],
  venue_status: ["Venue status saved.", true],
  city_bad: ["Type a city name of 2 to 60 letters.", false],
  venue_city_added: ["City and venue added. The venue is published.", true],
  venue_city: [
    "Choose a city from the list, or type a new city name (2 to 60 letters) and pick its country.",
    false,
  ],
  venue_exists: ["That city already has a venue with this name.", false],
  venue_bad: [
    "Check the venue: a name, a Google Maps link (google.com/maps or maps.app.goo.gl) and, if you add them, a website starting with https://, an Instagram handle or link and a Facebook page link.",
    false,
  ],
  bad_value: [
    "One of the values is outside its limits. Nothing else changed.",
    false,
  ],
  error: ["Something went wrong. Please try again.", false],
};

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "social", label: "Social and contact" },
  { id: "homepage", label: "Homepage" },
  { id: "locations", label: "Locations and venues" },
  { id: "review", label: "Review rules" },
  { id: "security", label: "Security" },
  { id: "emails", label: "Email templates" },
  { id: "admins", label: "Super admins" },
];

const num = (s: Record<string, unknown>, k: string, d: number) => {
  const n = Number(s[k]);
  return Number.isFinite(n) && n > 0 ? n : d;
};

function Card({
  id,
  title,
  children,
  note,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`${card} flex scroll-mt-6 flex-col gap-4`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-heading font-extrabold">
          {title}
        </h2>
        {note && <p className="text-sm text-radar-purple/75">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** A fixed value: shown, not edited here. */
function Fixed({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[220px_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-bold">{k}</dt>
          <dd className="mb-2 break-words sm:mb-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function NumberField({
  id,
  name,
  label,
  value,
  min,
  max,
  help,
}: {
  id: string;
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  help: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        min={min}
        max={max}
        required
        defaultValue={value}
        className={`${inputCls} min-h-11`}
      />
      <p className="text-xs text-radar-purple/70">
        {help} ({min} to {max})
      </p>
    </div>
  );
}

const LOCATION_MSGS = new Set([
  "city_added",
  "city_exists",
  "city_bad",
  "venue_added",
  "venue_exists",
  "venue_bad",
  "venue_city",
  "venue_status",
  "venue_city_added",
]);

const smallSelect =
  "min-h-11 rounded-button border-2 border-radar-purple/25 bg-white px-2 text-sm font-bold";

function venueTag(s: string) {
  if (s === "published") return <Tag tone="yellow">Published</Tag>;
  if (s === "pending") return <Tag tone="pink">Pending</Tag>;
  return <Tag tone="outline">{labelOf(CONTENT_STATUSES, s)}</Tag>;
}

/** The fields of a new venue, inside one city. */
function AddVenueForm({ cityId, code }: { cityId: string; code: string }) {
  const f = (
    name: string,
    label: string,
    ph: string,
    req = false,
    type = "text",
    max = 300,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`nv-${name}-${cityId}`} className={labelCls}>
        {label}
      </label>
      <input
        id={`nv-${name}-${cityId}`}
        name={name}
        type={type}
        required={req}
        maxLength={max}
        placeholder={ph}
        className={`${inputCls} min-h-11`}
      />
    </div>
  );
  return (
    <details className="rounded-button bg-lavender p-3">
      <summary className="cursor-pointer font-extrabold">+ Add a venue</summary>
      <form action={addVenue} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="city_id" value={cityId} />
        <input type="hidden" name="open" value={code} />
        {f(
          "name",
          "Venue name",
          "The name people know it by",
          true,
          "text",
          120,
        )}
        {f(
          "map_url",
          "Google Maps link",
          "https://maps.app.goo.gl/…",
          true,
          "url",
          500,
        )}
        {f("website", "Website (optional)", "https://", false, "url", 500)}
        {f(
          "instagram",
          "Instagram (optional)",
          "@venue or instagram.com/venue",
        )}
        {f("facebook", "Facebook (optional)", "facebook.com/venue")}
        <div className="flex items-end">
          <button className={outlineBtn}>Add venue</button>
        </div>
      </form>
    </details>
  );
}

function Locations({
  data,
  venues,
  open,
  msg,
}: {
  data: AdminSettings;
  venues: AdminVenueRow[];
  open: string;
  msg?: [string, boolean];
}) {
  const byCity = new Map<string, AdminVenueRow[]>();
  for (const v of venues)
    byCity.set(v.city_id, [...(byCity.get(v.city_id) ?? []), v]);
  const ret = (code: string) => `/admin/settings?open=${code}`;
  return (
    <Card
      id="locations"
      title="Locations and venues"
      note="Open a country to see its cities and the venues in each city. Shows in a country marked as a market count as In Egypt; others are On tour."
    >
      {msg && (
        <p
          role="status"
          className={`rounded-button px-4 py-3 font-extrabold ${msg[1] ? "bg-spotlight-yellow" : "bg-laugh-pink text-white"}`}
        >
          {msg[0]}
        </p>
      )}
      <p className="text-sm">
        Venues: {data.venues.published} published, {data.venues.pending}{" "}
        waiting.{" "}
        <Link
          href="/admin/shows?tab=venues"
          className="font-extrabold underline"
        >
          See all venues
        </Link>
        {data.venues.pending > 0 && (
          <>
            {" · "}
            <Link href="/admin/review" className="font-extrabold underline">
              Review waiting venues
            </Link>
          </>
        )}
      </p>
      <ul className="flex flex-col gap-2">
        {data.countries.map((c) => {
          const count = c.cities.reduce(
            (n, x) => n + (byCity.get(x.id)?.length ?? 0),
            0,
          );
          return (
            <li key={c.id}>
              <details
                open={open === c.code || undefined}
                className="group rounded-button border-2 border-radar-purple/15 open:border-radar-purple/40"
              >
                <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="inline-block text-xl leading-none font-extrabold transition-transform group-open:rotate-90"
                  >
                    ›
                  </span>
                  <span className="font-extrabold">
                    {flagOf(c.code)} {c.name}
                  </span>
                  {c.is_market && <Tag tone="yellow">Market</Tag>}
                  <span className="text-xs text-radar-purple/70">
                    {c.cities.length === 1
                      ? "1 city"
                      : `${c.cities.length} cities`}{" "}
                    · {count === 1 ? "1 venue" : `${count} venues`}
                    {c.region ? ` · ${c.region}` : ""}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-radar-purple/15 p-3">
                  {c.cities.length === 0 && (
                    <p className="text-sm text-radar-purple/70">
                      No cities yet. Add the first one below.
                    </p>
                  )}
                  {c.cities.map((x) => {
                    const list = byCity.get(x.id) ?? [];
                    return (
                      <section
                        key={x.id}
                        aria-labelledby={`city-${x.id}`}
                        className="flex flex-col gap-2 rounded-button bg-white p-3 shadow-[0_0_0_1px_rgba(43,11,79,0.08)]"
                      >
                        <h3 id={`city-${x.id}`} className="font-extrabold">
                          {x.name}{" "}
                          <span className="text-xs font-bold text-radar-purple/70">
                            (
                            {list.length === 1
                              ? "1 venue"
                              : `${list.length} venues`}
                            )
                          </span>
                        </h3>
                        {list.length > 0 && (
                          <ul className="flex flex-col divide-y divide-radar-purple/10">
                            {list.map((v) => (
                              <li
                                key={v.id}
                                className="flex flex-wrap items-center justify-between gap-2 py-2"
                              >
                                <span className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="font-bold break-words">
                                    {v.name}
                                  </span>
                                  {venueTag(v.status)}
                                  {v.upcoming > 0 && (
                                    <span className="text-xs text-radar-purple/70">
                                      {v.upcoming === 1
                                        ? "1 show coming up"
                                        : `${v.upcoming} shows coming up`}
                                    </span>
                                  )}
                                </span>
                                <span className="flex items-center gap-1">
                                  <form
                                    action={setContentStatus}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="hidden"
                                      name="kind"
                                      value="venue"
                                    />
                                    <input
                                      type="hidden"
                                      name="id"
                                      value={v.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="ret"
                                      value={ret(c.code)}
                                    />
                                    <label
                                      htmlFor={`vs-${v.id}`}
                                      className="sr-only"
                                    >
                                      Status of {v.name}
                                    </label>
                                    <select
                                      id={`vs-${v.id}`}
                                      name="status"
                                      defaultValue={v.status}
                                      className={smallSelect}
                                    >
                                      {CONTENT_STATUSES.map((st) => (
                                        <option key={st.value} value={st.value}>
                                          {st.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      className={`${outlineBtn} h-11 w-11 shrink-0 px-0!`}
                                      aria-label={`Save status of ${v.name}`}
                                      title="Save status"
                                    >
                                      <SaveIcon />
                                    </button>
                                  </form>
                                  <Link
                                    href={`/admin/shows?tab=venues&country=${c.code}&city=${x.id}&edit=${v.id}`}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-button hover:bg-lavender"
                                    aria-label={`Edit ${v.name}`}
                                    title="Edit the venue"
                                  >
                                    <EditIcon />
                                  </Link>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <AddVenueForm cityId={x.id} code={c.code} />
                      </section>
                    );
                  })}
                  <form
                    action={addCity}
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="country_id" value={c.id} />
                    <input type="hidden" name="open" value={c.code} />
                    <div className="flex flex-1 flex-col gap-1">
                      <label htmlFor={`nc-${c.id}`} className={labelCls}>
                        New city in {c.name}
                      </label>
                      <input
                        id={`nc-${c.id}`}
                        name="name"
                        required
                        minLength={2}
                        maxLength={60}
                        placeholder="City name in English"
                        className={`${inputCls} min-h-11`}
                      />
                    </div>
                    <button className={outlineBtn}>+ Add city</button>
                  </form>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/admin/settings">["searchParams"];
}) {
  await connection();
  const sp = await searchParams;
  const [data, venues] = await Promise.all([
    getAdminSettings(),
    getAdminVenues("", ""),
  ]);
  const s = data.settings;
  const msgKey = one(sp.msg);
  const locMsg = LOCATION_MSGS.has(msgKey) ? MSG[msgKey] : undefined;
  const msg = locMsg ? undefined : MSG[msgKey];
  const open = /^[A-Z]{2}$/.test(one(sp.open)) ? one(sp.open) : "";
  const egypt = data.countries.find((c) => c.code === "EG");
  const defaultCity =
    typeof s.default_city === "string" ? s.default_city : "cairo";
  const instagram =
    typeof s.instagram_handle === "string"
      ? s.instagram_handle
      : "@comedy_radar";
  const email =
    typeof s.contact_email === "string"
      ? s.contact_email
      : "comedyradarnetwork@gmail.com";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav
        aria-label="Settings sections"
        className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:overflow-visible"
      >
        {SECTIONS.map((x) => (
          <a
            key={x.id}
            href={`#${x.id}`}
            className="inline-flex min-h-11 shrink-0 items-center rounded-button bg-white px-3 text-[15px] font-extrabold hover:bg-lavender lg:bg-transparent"
          >
            {x.label}
          </a>
        ))}
      </nav>

      <div className="flex min-w-0 flex-col gap-6">
        {msg && (
          <p
            role="status"
            className={`rounded-card px-4 py-3 font-extrabold ${msg[1] ? "bg-spotlight-yellow" : "bg-laugh-pink"}`}
          >
            {msg[0]}
          </p>
        )}

        <Card id="general" title="General" note="Fixed for launch.">
          <Fixed
            rows={[
              ["Site name", "Comedy Radar"],
              ["Tagline", "If it's live and it's funny, it's on the radar."],
              ["Language", "English (fixed)"],
              ["Time zone", "Africa/Cairo (fixed)"],
              ["Launch market", `${flagOf("EG")} Egypt`],
              [
                "Domain",
                "On hold. The site runs on its Vercel address for now.",
              ],
            ]}
          />
        </Card>

        <Card
          id="social"
          title="Social and contact"
          note="Instagram is the only social account at launch. Other platforms stay hidden until they have a handle."
        >
          <Fixed
            rows={[
              ["Instagram", instagram],
              ["Contact email", email],
            ]}
          />
        </Card>

        <Card id="homepage" title="Homepage">
          <form action={saveSettings} className="flex flex-col gap-4">
            <input type="hidden" name="section" value="homepage" />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="hp-coming"
                name="coming_up_count"
                label="Coming up: shows"
                value={num(s, "coming_up_count", 8)}
                min={4}
                max={24}
                help="Shows in the Coming up grid"
              />
              <NumberField
                id="hp-track"
                name="track_count"
                label="Comedians to track"
                value={num(s, "track_count", 6)}
                min={3}
                max={12}
                help="Comedians and groups in the row"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="hp-city" className={labelCls}>
                  Default city
                </label>
                <select
                  id="hp-city"
                  name="default_city"
                  defaultValue={defaultCity}
                  className={`${inputCls} min-h-11`}
                >
                  {(egypt?.cities ?? []).map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-radar-purple/70">
                  Used by the &quot;Within range&quot; filter until a visitor
                  picks a city.
                </p>
              </div>
            </div>
            <p className="text-sm text-radar-purple/80">
              Spotlight slides and auto-advance are set on the{" "}
              <Link
                href="/admin/spotlight"
                className="font-extrabold underline"
              >
                Spotlight page
              </Link>
              . Comedians to track are picked automatically.
            </p>
            <button className={`${yellowBtn} self-start`}>Save homepage</button>
          </form>
        </Card>

        <Locations data={data} venues={venues} open={open} msg={locMsg} />

        <Card id="review" title="Review rules">
          <form action={saveSettings} className="flex flex-col gap-4">
            <input type="hidden" name="section" value="review" />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="rr-signal"
                name="new_signal_days"
                label="New Signal lasts (days)"
                value={num(s, "new_signal_days", 7)}
                min={1}
                max={30}
                help="Days a new show keeps the New badge"
              />
            </div>
            <button className={`${yellowBtn} self-start`}>Save</button>
          </form>
          <Fixed
            rows={[
              [
                "New profiles",
                "Reviewed by Comedy Radar before they go public",
              ],
              [
                "Shows from unverified profiles",
                "Reviewed before they go public; verified profiles publish at once",
              ],
              ["Name changes on verified profiles", "Reviewed"],
              ["Claims", "Reviewed, with proof (Instagram DM or document)"],
              [
                "Tags in lineups, groups and podcasts",
                "Shown only after the tagged profile's admin accepts",
              ],
              ["Team invitations", "Expire after 7 days"],
            ]}
          />
          <p className="text-xs text-radar-purple/70">
            These rules are built into the database. Turning one off would need
            a code change.
          </p>
        </Card>

        <Card id="security" title="Security">
          <Fixed
            rows={[
              [
                "2-step for super admins",
                <Tag key="2s" tone="purple">
                  Required
                </Tag>,
              ],
              ["2-step for profile admins", "Not offered yet"],
              [
                "Passwords",
                "Handled only by Supabase Auth. Nobody can see them.",
              ],
              [
                "Password length, sign-in attempts, leaked-password check, email confirmation",
                "Set in Supabase: Authentication, then Sign In / Providers and Rate Limits",
              ],
            ]}
          />
        </Card>

        <Card id="emails" title="Email templates">
          <Fixed
            rows={[
              [
                "Confirm email",
                "Sent by Supabase Auth. Edit in Supabase: Authentication, then Emails",
              ],
              [
                "Password reset",
                "Sent by Supabase Auth. Edit in Supabase: Authentication, then Emails",
              ],
              [
                "Team invitation",
                "Shared as a private link from the dashboard (no email yet)",
              ],
              [
                "Manager confirmation, claim decisions, link requests, show review",
                "Shown in the dashboard. Emails come with the email service later.",
              ],
            ]}
          />
        </Card>

        <Card
          id="admins"
          title="Super admins"
          note="Added only in the database, never from the website."
        >
          <ul className="flex flex-col divide-y divide-radar-purple/10 text-sm">
            {data.super_admins.map((a) => (
              <li
                key={a.email ?? a.name}
                className="flex flex-wrap items-center gap-2 py-2"
              >
                <span className="font-bold">{a.name ?? "No name"}</span>
                <span className="break-all text-radar-purple/70">
                  {a.email}
                </span>
                {a.two_step ? (
                  <Tag tone="outline">2-step on</Tag>
                ) : (
                  <Tag tone="pink">2-step off</Tag>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Admin Settings (spec 11.5 item 8). */
export default function AdminSettingsPage({
  searchParams,
}: PageProps<"/admin/settings">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[32px] leading-none md:text-[44px]">
        SETTINGS
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
