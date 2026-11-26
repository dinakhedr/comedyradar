import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { addCity, addVenue, saveSettings } from "@/app/actions/admin-settings";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, Tag, yellowBtn } from "@/components/dashboard/ui";
import { flagOf } from "@/lib/countries";
import { getAdminSettings, type AdminSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Settings" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, [string, boolean]> = {
  saved: ["Settings saved. The website updates within a few minutes.", true],
  city_added: ["City added.", true],
  city_exists: ["That city is already in the list.", false],
  venue_added: ["Venue added and published.", true],
  venue_city_added: ["City and venue added. The venue is published.", true],
  venue_city: [
    "Choose a city from the list, or type a new city name (2 to 60 letters) and pick its country.",
    false,
  ],
  venue_exists: ["That city already has a venue with this name.", false],
  venue_bad: [
    "Check the venue: a name, a Google Maps link (google.com/maps or maps.app.goo.gl) and, if you add one, a website starting with https://.",
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

function Locations({ data }: { data: AdminSettings }) {
  return (
    <Card
      id="locations"
      title="Locations and venues"
      note="Countries come with the database. Shows in a country marked as a market count as In Egypt; others are On tour."
    >
      <div className="relative -mx-4 overflow-x-auto md:mx-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-radar-purple/15 text-xs tracking-wider text-radar-purple/70 uppercase">
              <th className="px-4 py-2 font-extrabold md:px-2">Country</th>
              <th className="px-2 py-2 font-extrabold">Region</th>
              <th className="px-2 py-2 font-extrabold">Market</th>
              <th className="px-2 py-2 font-extrabold">Cities (venues)</th>
            </tr>
          </thead>
          <tbody>
            {data.countries.map((c) => (
              <tr
                key={c.id}
                className="border-b border-radar-purple/10 align-top"
              >
                <td className="px-4 py-2 font-bold whitespace-nowrap md:px-2">
                  {flagOf(c.code)} {c.name}
                </td>
                <td className="px-2 py-2">{c.region ?? ""}</td>
                <td className="px-2 py-2">
                  {c.is_market ? (
                    <Tag tone="yellow">Market</Tag>
                  ) : (
                    <span className="text-xs text-radar-purple/60">No</span>
                  )}
                </td>
                <td className="px-2 py-2 text-xs">
                  {c.cities.length === 0 ? (
                    <span className="text-radar-purple/60">None yet</span>
                  ) : (
                    c.cities
                      .map((x) =>
                        x.venues ? `${x.name} (${x.venues})` : x.name,
                      )
                      .join(", ")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        action={addCity}
        className="grid gap-3 rounded-button bg-lavender p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="city-country" className={labelCls}>
            Country
          </label>
          <select
            id="city-country"
            name="country_id"
            required
            className={`${inputCls} min-h-11`}
          >
            {data.countries.map((c) => (
              <option key={c.id} value={c.id}>
                {flagOf(c.code)} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="city-name" className={labelCls}>
            New city
          </label>
          <input
            id="city-name"
            name="name"
            required
            minLength={2}
            maxLength={60}
            placeholder="City name in English"
            className={`${inputCls} min-h-11`}
          />
        </div>
        <button className={outlineBtn}>Add city</button>
      </form>
      <form
        action={addVenue}
        className="grid gap-3 rounded-button bg-lavender p-3 sm:grid-cols-2"
      >
        <p className="font-extrabold sm:col-span-2">Add a venue</p>
        <div className="flex flex-col gap-1">
          <label htmlFor="venue-city" className={labelCls}>
            City
          </label>
          <select
            id="venue-city"
            name="city_id"
            defaultValue=""
            className={`${inputCls} min-h-11`}
          >
            <option value="">Choose a city</option>
            {data.countries
              .filter((c) => c.cities.length > 0)
              .map((c) => (
                <optgroup key={c.id} label={`${flagOf(c.code)} ${c.name}`}>
                  {c.cities.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="venue-name" className={labelCls}>
            Venue name
          </label>
          <input
            id="venue-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="The name people know it by"
            className={`${inputCls} min-h-11`}
          />
        </div>
        <details className="rounded-button bg-white/70 p-3 sm:col-span-2">
          <summary className="cursor-pointer font-bold">
            City not in the list? Add a new one
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="venue-new-country" className={labelCls}>
                Country
              </label>
              <select
                id="venue-new-country"
                name="new_city_country"
                className={`${inputCls} min-h-11`}
              >
                {data.countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {flagOf(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="venue-new-city" className={labelCls}>
                New city
              </label>
              <input
                id="venue-new-city"
                name="new_city"
                minLength={2}
                maxLength={60}
                placeholder="City name in English"
                className={`${inputCls} min-h-11`}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-radar-purple/75">
            If you type a new city, it is added and the venue goes in it.
          </p>
        </details>
        <div className="flex flex-col gap-1">
          <label htmlFor="venue-map" className={labelCls}>
            Google Maps link
          </label>
          <input
            id="venue-map"
            name="map_url"
            type="url"
            required
            maxLength={500}
            placeholder="https://maps.app.goo.gl/…"
            className={`${inputCls} min-h-11`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="venue-web" className={labelCls}>
            Website (optional)
          </label>
          <input
            id="venue-web"
            name="website"
            type="url"
            maxLength={500}
            placeholder="https://"
            className={`${inputCls} min-h-11`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className={outlineBtn}>Add venue</button>
          <span className="text-xs text-radar-purple/75">
            Venues added here are published at once and can be picked when
            adding a show.
          </span>
        </div>
      </form>
      <p className="text-sm">
        Venues: {data.venues.published} published, {data.venues.pending}{" "}
        waiting.{" "}
        <Link
          href="/admin/shows?tab=venues"
          className="font-extrabold underline"
        >
          Manage venues
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
  const data = await getAdminSettings();
  const s = data.settings;
  const msg = MSG[one(sp.msg)];
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

        <Locations data={data} />

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
