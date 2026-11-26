import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { saveSettings } from "@/app/actions/admin-settings";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, Tag, yellowBtn } from "@/components/dashboard/ui";
import { flagOf } from "@/lib/countries";
import {
  StatusLegend,
  VenueLocations,
} from "@/components/admin/venue-locations";
import {
  getAdminSettings,
  getAdminVenues,
  type AdminSettings,
  type AdminVenueRow,
} from "@/lib/data/admin";
import { ErrorNote, SuccessNote } from "@/components/status-note";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Settings" };

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const MSG: Record<string, [string, boolean]> = {
  saved: ["Settings saved. The website updates within a few minutes.", true],
  city_added: ["City added.", true],
  city_exists: ["That city is already in the list.", false],
  city_bad: ["Type a city name of 2 to 60 letters.", false],
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

const LOCATION_MSGS = new Set(["city_added", "city_exists", "city_bad"]);

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
  return (
    <Card
      id="locations"
      title="Locations and venues"
      note="Open a country to see its cities. Press + beside a city to add a venue there. Shows in a country marked as a market count as In Egypt; others are On tour."
    >
      <StatusLegend />
      {msg && (
        msg[1] ? (
          <SuccessNote className="text-sm">{msg[0]}</SuccessNote>
        ) : (
          <ErrorNote className="text-sm">{msg[0]}</ErrorNote>
        )
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
      <VenueLocations countries={data.countries} venues={venues} open={open} />
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
          msg[1] ? (
            <SuccessNote>{msg[0]}</SuccessNote>
          ) : (
            <ErrorNote>{msg[0]}</ErrorNote>
          )
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
            <SubmitButton className={`${yellowBtn} self-start`}>Save homepage</SubmitButton>
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
            <SubmitButton className={`${yellowBtn} self-start`}>Save</SubmitButton>
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
