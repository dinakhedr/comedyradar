"use client";

import { Fragment, useActionState, useState } from "react";
import { addCity, addVenue, editVenue } from "@/app/actions/admin-settings";
import { inputCls } from "@/components/auth/field-classes";
import { EditIcon, SaveIcon } from "@/components/icons";
import { flagOf } from "@/lib/countries";
import type { AdminSettings, AdminVenueRow } from "@/lib/data/admin";
import {
  EMPTY_VENUE_STATE,
  errText,
  okText,
  type VenueField,
  type VenueFormState,
} from "@/lib/venue-forms";

type Country = AdminSettings["countries"][number];
type City = Country["cities"][number];

const STATUS = {
  published: { label: "Published", cls: "bg-[#1f9d55] text-white" },
  pending: { label: "Pending", cls: "bg-spotlight-yellow text-radar-purple" },
  archived: { label: "Archived", cls: "bg-[#e2e0e6] text-[#55506a]" },
  draft: {
    label: "Draft",
    cls: "border-2 border-dashed border-[#a39cb3] bg-white text-[#7d7590]",
  },
} as const;
type Status = keyof typeof STATUS;
const statusOf = (s: string): Status => (s in STATUS ? (s as Status) : "draft");

function StatusGlyph({ s }: { s: Status }) {
  const p = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (s === "published")
    return (
      <svg {...p} strokeWidth={3.2}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  if (s === "pending")
    return (
      <svg {...p} strokeWidth={2.6}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  if (s === "archived")
    return (
      <svg {...p} strokeWidth={2.4}>
        <rect x="3" y="4" width="18" height="5" rx="1" />
        <path d="M5 9v10h14V9M10 13h4" />
      </svg>
    );
  return (
    <svg {...p} width={12} height={12} strokeWidth={2.6}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  );
}

/** A small coloured status icon; its name shows on hover and keyboard focus. */
export function StatusIcon({ status }: { status: string }) {
  const s = statusOf(status);
  const { label, cls } = STATUS[s];
  return (
    <span
      role="img"
      aria-label={label}
      tabIndex={0}
      className={`group/st relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cls}`}
    >
      <StatusGlyph s={s} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-radar-purple px-2 py-1 text-xs font-bold whitespace-nowrap text-white group-hover/st:block group-focus/st:block"
      >
        {label}
      </span>
    </span>
  );
}

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
  onDone,
  onCancel,
}: {
  mode: "add" | "edit";
  city: City;
  venue?: AdminVenueRow;
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
        {field(
          "name",
          "Venue name",
          "The name people know it by",
          true,
          "text",
          120,
        )}
        {venue &&
          field(
            "address",
            "Address (optional)",
            "Street and area",
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
        <p role="alert" className={errText}>
          {state.message}
        </p>
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
        <span className="font-bold break-words">{v.name}</span>
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
  const [notice, setNotice] = useState<{ at: string; text: string } | null>(
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
    setNotice({ at, text });
  };
  const close = () => setForm(null);
  const noticeAt = (at: string) =>
    notice?.at === at ? (
      <p
        role="status"
        className={`${okText} flex items-center gap-1.5 bg-white px-3 pt-2 pb-1 sm:pl-7`}
      >
        <SaveIcon size={16} />
        {notice.text}
      </p>
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
                  <button className={`${purpleBtn} text-spotlight-yellow!`}>
                    <PlusIcon /> Add city
                  </button>
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
