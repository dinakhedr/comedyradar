"use client";

import { Fragment, useActionState, useState } from "react";
import { addCity, addVenue, editVenue } from "@/app/actions/admin-settings";
import { inputCls } from "@/components/auth/field-classes";
import { EditIcon, SaveIcon } from "@/components/icons";
import { flagOf } from "@/lib/countries";
import type { AdminSettings, AdminVenueRow } from "@/lib/data/admin";
import {
  EMPTY_VENUE_STATE,
  type VenueField,
  type VenueFormState,
} from "@/lib/venue-forms";
import { ErrorNote, SuccessNote } from "@/components/status-note";
import { StatusIcon } from "@/components/status";
import { STATUS_LABELS } from "@/lib/status";
import { SubmitButton } from "@/components/submit-button";
import { LogoPicker } from "@/components/admin/logo-picker";
import { PinIcon } from "@/components/icons";


type Country = AdminSettings["countries"][number];
type City = Country["cities"][number];

// Venues use four of the five statuses (no Rejected). Colours and icons: src/components/status.tsx.
const VENUE_STATUSES = ["published", "pending", "archived", "draft"] as const;
const STATUS = Object.fromEntries(VENUE_STATUSES.map((s) => [s, { label: STATUS_LABELS[s] }])) as Record<
  (typeof VENUE_STATUSES)[number],
  { label: string }
>;
type Status = keyof typeof STATUS;
const statusOf = (s: string): Status => (s in STATUS ? (s as Status) : "draft");

function PlusIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const purpleBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-radar-purple px-4 text-[15px] font-extrabold text-white hover:bg-radar-plum disabled:bg-radar-plum disabled:opacity-90";

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className={purpleBtn}>
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
          />
          Saving…
        </>
      ) : (
        <>
          <SaveIcon size={18} />
          Save
        </>
      )}
    </button>
  );
}

/** The add and edit venue form: labelled fields, red error text, Saving… while it saves. */
function VenueForm({
  mode,
  city,
  venue,
  areas,
  onDone,
  onCancel,
}: {
  mode: "add" | "edit";
  city: City;
  venue?: AdminVenueRow;
  /** Areas already used in this city, offered as suggestions. */
  areas: string[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: VenueFormState, form: FormData) => {
      const r = await (mode === "add" ? addVenue : editVenue)(prev, form);
      if (r.ok) onDone(r.message);
      return r;
    },
    EMPTY_VENUE_STATE,
  );
  const id = `${mode}-${venue?.id ?? city.id}`;
  const start: Partial<Record<VenueField, string>> = venue
    ? {
        name: venue.name,
        area: venue.area ?? "",
        address: venue.address ?? "",
        map_url: venue.map_url ?? "",
        website: venue.website ?? "",
        instagram: venue.instagram_url ?? "",
        facebook: venue.facebook_url ?? "",
        status: statusOf(venue.status),
      }
    : {};
  const val = (k: VenueField) => (state.message ? state.values[k] : start[k]);
  const field = (
    name: VenueField,
    label: string,
    ph: string,
    req = false,
    type = "text",
    max = 300,
    list?: string,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${name}`} className="text-sm font-extrabold">
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        name={name}
        type={type}
        required={req}
        maxLength={max}
        placeholder={ph}
        defaultValue={val(name)}
        list={list}
        className={`${inputCls} min-h-11!`}
      />
    </div>
  );
  return (
    <form
      action={action}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 border-b border-radar-purple/10 bg-[#FFF8E1] px-3 py-4 sm:pl-7"
    >
      <h4 id={`${id}-title`} className="font-extrabold">
        {venue ? `Edit ${venue.name}` : `New venue in ${city.name}`}
      </h4>
      <input type="hidden" name="city_name" value={city.name} />
      {venue ? (
        <>
          <input type="hidden" name="id" value={venue.id} />
          <input
            type="hidden"
            name="old_status"
            value={statusOf(venue.status)}
          />
        </>
      ) : (
        <input type="hidden" name="city_id" value={city.id} />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <LogoPicker id={id} current={venue?.logo_url ?? null} name={venue?.name ?? ""} />
        {field(
          "name",
          "Venue name",
          "The name people know it by",
          true,
          "text",
          120,
        )}
        {field(
          "area",
          "Area (optional)",
          city.name === "Giza" ? "e.g. Sheikh Zayed" : "e.g. New Cairo, Zamalek",
          false,
          "text",
          60,
          `${id}-areas`,
        )}
        <datalist id={`${id}-areas`}>
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        {venue &&
          field(
            "address",
            "Address (optional)",
            "Street and building",
            false,
            "text",
            200,
          )}
        {field(
          "map_url",
          "Google Maps link",
          "https://maps.app.goo.gl/…",
          true,
          "url",
          500,
        )}
        {field("website", "Website (optional)", "https://", false, "url", 500)}
        {field(
          "instagram",
          "Instagram (optional)",
          "@venue or instagram.com/venue",
        )}
        {field("facebook", "Facebook (optional)", "facebook.com/venue")}
        {venue && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-status`} className="text-sm font-extrabold">
              Status
            </label>
            <select
              id={`${id}-status`}
              name="status"
              defaultValue={val("status")}
              className={`${inputCls} min-h-11! font-bold`}
            >
              {(Object.keys(STATUS) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {state.message && !state.ok && (
        <ErrorNote className="text-sm">{state.message}</ErrorNote>
      )}
      <div className="flex items-center gap-4">
        <SaveButton pending={pending} />
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 font-bold underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function VenueRow({
  v,
  editing,
  onEdit,
}: {
  v: AdminVenueRow;
  editing: boolean;
  onEdit: () => void;
}) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 border-b border-radar-purple/10 bg-white py-0.5 pr-1 pl-3 sm:pl-7">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <StatusIcon status={v.status} />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-radar-purple/15 bg-white">
          {v.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos come from Supabase Storage
            <img src={v.logo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <PinIcon size={16} className="text-radar-purple/40" />
          )}
        </span>
        <span className="font-bold break-words">{v.name}</span>
        {v.area && <span className="text-xs text-radar-purple/70">{v.area}</span>}
        {v.upcoming > 0 && (
          <span className="text-xs text-radar-purple/70">
            {v.upcoming === 1
              ? "1 show coming up"
              : `${v.upcoming} shows coming up`}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-expanded={editing}
        aria-label={`Edit ${v.name}`}
        title="Edit the venue"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button hover:bg-lavender"
      >
        <EditIcon />
      </button>
    </li>
  );
}

/** Settings > Locations and venues: countries, their cities as rows, and the venues in each city. */
export function VenueLocations({
  countries,
  venues,
  open,
}: {
  countries: Country[];
  venues: AdminVenueRow[];
  open: string;
}) {
  // One form open at a time: "add:<city id>" or "edit:<venue id>".
  const [form, setForm] = useState<string | null>(null);
  // The last green message, shown under its city or above its venue.
  const [notice, setNotice] = useState<{ at: string; text: string; n: number } | null>(
    null,
  );
  const byCity = new Map<string, AdminVenueRow[]>();
  for (const v of venues)
    byCity.set(v.city_id, [...(byCity.get(v.city_id) ?? []), v]);
  const toggle = (key: string) => {
    setNotice(null);
    setForm((f) => (f === key ? null : key));
  };
  const done = (at: string) => (text: string) => {
    setForm(null);
    setNotice((old) => ({ at, text, n: (old?.n ?? 0) + 1 }));
  };
  const close = () => setForm(null);
  const noticeAt = (at: string) =>
    notice?.at === at ? (
      <SuccessNote key={notice.n} className="bg-white px-3 pt-2 pb-1 text-sm sm:pl-7">
        {notice.text}
      </SuccessNote>
    ) : null;

  return (
    <ul className="flex flex-col gap-2 text-radar-purple">
      {countries.map((c) => {
        const count = c.cities.reduce(
          (n, x) => n + (byCity.get(x.id)?.length ?? 0),
          0,
        );
        return (
          <li key={c.id}>
            <details
              open={open ? open === c.code : c.is_market}
              className="group overflow-hidden rounded-button border-2 border-radar-purple/15 open:border-radar-purple/40"
            >
              <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="inline-block text-xl leading-none font-extrabold transition-transform group-open:rotate-90"
                >
                  ›
                </span>
                <span className="text-lg font-extrabold">
                  {flagOf(c.code)} {c.name}
                </span>
                {c.is_market && (
                  <span className="rounded-md bg-spotlight-yellow px-2 py-0.5 text-[11px] font-extrabold tracking-wider uppercase">
                    Market
                  </span>
                )}
                <span className="text-xs text-radar-purple/70">
                  {c.cities.length === 1
                    ? "1 city"
                    : `${c.cities.length} cities`}{" "}
                  · {count === 1 ? "1 venue" : `${count} venues`}
                  {c.region ? ` · ${c.region}` : ""}
                </span>
              </summary>
              <div className="border-t border-radar-purple/15">
                {c.cities.length === 0 && (
                  <p className="px-3 py-2 text-sm text-radar-purple/70">
                    No cities yet. Add the first one below.
                  </p>
                )}
                {c.cities.map((x) => {
                  const list = byCity.get(x.id) ?? [];
                  const addKey = `add:${x.id}`;
                  const areas = [...new Set(list.map((v) => v.area).filter((a): a is string => !!a))].sort();
                  return (
                    <section key={x.id} aria-labelledby={`city-${x.id}`}>
                      <div className="flex min-h-11 items-center justify-between gap-2 bg-lavender py-1 pr-1 pl-3">
                        <h3 id={`city-${x.id}`} className="font-extrabold">
                          {x.name}{" "}
                          <span className="text-xs font-normal text-radar-purple/70">
                            ·{" "}
                            {list.length === 0
                              ? "no venues yet"
                              : list.length === 1
                                ? "1 venue"
                                : `${list.length} venues`}
                          </span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => toggle(addKey)}
                          aria-expanded={form === addKey}
                          aria-label={`Add a venue in ${x.name}`}
                          title={`Add a venue in ${x.name}`}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-radar-purple text-spotlight-yellow hover:bg-radar-plum"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      {form === addKey && (
                        <VenueForm
                          mode="add"
                          city={x}
                          areas={areas}
                          onDone={done(x.id)}
                          onCancel={close}
                        />
                      )}
                      {noticeAt(x.id)}
                      {list.length > 0 && (
                        <ul>
                          {list.map((v) => {
                            const editKey = `edit:${v.id}`;
                            return (
                              <Fragment key={v.id}>
                                {notice?.at === v.id && (
                                  <li>{noticeAt(v.id)}</li>
                                )}
                                <VenueRow
                                  v={v}
                                  editing={form === editKey}
                                  onEdit={() => toggle(editKey)}
                                />
                                {form === editKey && (
                                  <li>
                                    <VenueForm
                                      mode="edit"
                                      city={x}
                                      venue={v}
                                      areas={areas}
                                      onDone={done(v.id)}
                                      onCancel={close}
                                    />
                                  </li>
                                )}
                              </Fragment>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
                <form
                  action={addCity}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                >
                  <input type="hidden" name="country_id" value={c.id} />
                  <input type="hidden" name="open" value={c.code} />
                  <label htmlFor={`nc-${c.id}`} className="sr-only">
                    New city in {c.name}
                  </label>
                  <input
                    id={`nc-${c.id}`}
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder={`New city in ${c.name}`}
                    className={`${inputCls} min-h-11! flex-1`}
                  />
                  <SubmitButton className={`${purpleBtn} text-spotlight-yellow!`}>
                    <PlusIcon /> Add city
                  </SubmitButton>
                </form>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

/** The key under the card title: what each status icon means. */
export function StatusLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-radar-purple/75">
      {(Object.keys(STATUS) as Status[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <StatusIcon status={s} />
          {STATUS[s].label}
        </span>
      ))}
      <span>· hover an icon to see its name</span>
    </p>
  );
}
