"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { adminSaveTour, saveTour, type TourState } from "@/app/actions/tours";
import { AdminSaveRow } from "@/components/admin/admin-save-row";
import { PerformerPicker } from "@/components/shows/performer-picker";
import { errorCls, FormMessage, inputCls, labelCls } from "@/components/auth/fields";
import { card, outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { CloseIcon, EditIcon } from "@/components/icons";
import { MemberPicker } from "@/components/profiles/create-form";
import { Field } from "@/components/shows/show-form";
import { TourCard } from "@/components/tour-card";
import type { ManagedProfile } from "@/lib/dashboard";
import type { CityOption, VenueOption } from "@/lib/data/my-shows";
import type { EditableTour, ImportableShow } from "@/lib/data/my-tours";
import { formatShowDate } from "@/lib/dates";
import { AGE_RATINGS, cairoToIso, CURRENCIES, SHOW_LANGUAGES } from "@/lib/show-forms";
import { DEFAULT_TITLE_PATTERN, DOORS_OPTIONS, isBlankDate, MAX_TOUR_DATES, parsePastedDates, TICKET_STATUSES, type TourDateInput } from "@/lib/tour-forms";
import { SubmitButton } from "@/components/submit-button";
import { LinkPending } from "@/components/link-pending";

type Row = TourDateInput & { key: number };

const blank = (key: number, from?: Partial<TourDateInput>): Row => ({
  key,
  date: "",
  time: from?.time ?? "",
  city_id: "",
  venue_id: "",
  venue_name: "",
  ticket_url: "",
  ticket_status: "on_sale",
  ...from,
});

const pkey = (p: ManagedProfile) => `${p.kind === "group" ? "g" : "c"}:${p.id}`;

/** Add a tour, or edit one and add dates, with a live preview of its card (spec 11.4 item 8). */
export function TourForm({
  profiles,
  cities,
  venues,
  importable,
  tour,
  defaultPerformer,
  focusDates,
  admin = false,
}: {
  profiles: ManagedProfile[];
  cities: CityOption[];
  venues: VenueOption[];
  importable: ImportableShow[];
  tour?: EditableTour | null;
  defaultPerformer?: string;
  /** Opened from "+ Add dates": scroll to the dates. */
  focusDates?: boolean;
  /** Admin > Add new tour: any profile, and a status to pick. */
  admin?: boolean;
}) {
  const [state, action, pending] = useActionState<TourState, FormData>(admin ? adminSaveTour : saveTour, {});
  const e = state.errors ?? {};
  const back = state.input;

  const [performer, setPerformer] = useState(tour?.performer ?? defaultPerformer ?? (profiles.length === 1 ? pkey(profiles[0]) : ""));
  const [name, setName] = useState(tour?.name ?? "");
  const [description, setDescription] = useState(tour?.description ?? "");
  const [poster, setPoster] = useState<string | null>(tour?.poster_url ?? null);
  const nextKey = useRef(1);
  const [rows, setRows] = useState<Row[]>(() => [blank(0)]);
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [imports, setImports] = useState<Set<string>>(new Set());
  const datesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusDates) datesRef.current?.scrollIntoView({ block: "start" });
  }, [focusDates]);
  useEffect(() => () => {
    if (poster?.startsWith("blob:")) URL.revokeObjectURL(poster);
  }, [poster]);

  const byCountry = useMemo(() => {
    const m = new Map<string, CityOption[]>();
    for (const c of cities) m.set(c.country_name, [...(m.get(c.country_name) ?? []), c]);
    return [...m.entries()];
  }, [cities]);
  const cityOf = (id: string) => cities.find((c) => c.id === id);
  const picked = profiles.find((p) => pkey(p) === performer);
  const myImportable = importable.filter((s) => s.performer === performer);

  const update = (key: number, patch: Partial<TourDateInput>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => (rs.length >= MAX_TOUR_DATES ? rs : [...rs, blank(nextKey.current++, { time: rs.at(-1)?.time })]));
  const removeRow = (key: number) => setRows((rs) => (rs.length === 1 ? [blank(nextKey.current++)] : rs.filter((r) => r.key !== key)));

  const addPasted = () => {
    const { rows: found, skipped } = parsePastedDates(paste, cities);
    const unknown: string[] = [];
    const made = found.map((f) => {
      // A venue name that is on the list is picked; any other name is left empty (only Comedy Radar adds venues).
      const known = f.venue_name ? venues.find((v) => v.city_id === f.city_id && v.name.toLowerCase() === f.venue_name.toLowerCase()) : undefined;
      if (f.venue_name && !known) unknown.push(f.venue_name);
      return blank(nextKey.current++, { ...f, venue_id: known ? known.id : "", venue_name: "" });
    });
    setRows((rs) => [...rs.filter((r) => !isBlankDate(r)), ...made].slice(0, MAX_TOUR_DATES) as Row[]);
    setPasteNote(
      `${made.length === 1 ? "1 date added" : `${made.length} dates added`}.` +
        (skipped.length ? ` We couldn't read: ${skipped.slice(0, 3).join(" / ")}${skipped.length > 3 ? "…" : ""}. Each line needs a date and a city from the list.` : "") +
        (unknown.length
          ? ` Not on our venue list yet: ${[...new Set(unknown)].slice(0, 3).join(" / ")}${unknown.length > 3 ? "…" : ""}. Those dates have no venue for now; contact Comedy Radar to add it.`
          : ""),
    );
    if (made.length) setPaste("");
  };

  // Preview: the tour card with every date the form knows about.
  const filled = rows.filter((r) => r.date && r.city_id);
  const all = [
    ...(tour?.dates ?? []).filter((d) => d.status !== "cancelled").map((d) => ({ at: d.starts_at, city: d.city_name ?? "" })),
    ...filled.map((r) => ({ at: cairoToIso(r.date, r.time || "20:00") ?? new Date(`${r.date}T18:00:00Z`).toISOString(), city: cityOf(r.city_id)?.name ?? "" })),
    ...myImportable.filter((s) => imports.has(s.id)).map((s) => ({ at: s.starts_at, city: s.city_name ?? "" })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const countries = new Set([...filled.map((r) => cityOf(r.city_id)?.country_id)].filter(Boolean)).size;
  const [fallbackAt] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString());
  const preview = {
    id: "preview",
    slug: tour?.slug ?? "preview",
    name: name.trim() || "Your tour name",
    poster_url: poster,
    owner_type: picked?.kind ?? "comedian",
    owner_name: picked?.name ?? "Comedian or group",
    owner_slug: picked?.slug ?? "",
    owner_photo_url: picked?.photo_url ?? null,
    first_show_at: all[0]?.at ?? fallbackAt,
    last_show_at: all.at(-1)?.at ?? fallbackAt,
    next_show_at: all[0]?.at ?? fallbackAt,
    show_count: all.length,
    country_count: countries || 1,
    cities: [...new Set(all.map((d) => d.city).filter(Boolean))],
  };

  // Publish checklist (spec 11.4 item 8).
  const total = (tour?.dates.length ?? 0) + filled.length + imports.size;
  const checklist = [
    { ok: !!name.trim() && !!poster, label: "Name and poster" },
    { ok: total > 0, label: "At least one date" },
    { ok: total > 0 && filled.every((r) => r.ticket_status !== "on_sale" || !!r.ticket_url.trim()), label: "Ticket links for dates on sale" },
    { ok: filled.every((r) => !!r.venue_id), label: "Venues" },
  ];

  const live = tour && tour.status !== "draft";
  const publishLabel = live ? "Save changes" : picked?.verified ? "Publish tour" : "Send for review";

  return (
    <form action={action} className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start" noValidate>
      {tour && <input type="hidden" name="tour_id" value={tour.id} />}
      <div className="flex min-w-0 flex-col gap-6">
        <FormMessage message={state.message} />

        {/* 1. Who is touring */}
        <section aria-labelledby="who" className={`${card} flex flex-col gap-4`}>
          <h2 id="who" className="text-heading font-extrabold">
            1. Who is touring
          </h2>
          {tour ? (
            <>
              <input type="hidden" name="performer" value={performer} />
              <p className="text-base">
                <span className="font-extrabold">{picked?.name ?? "This profile"}</span> ({picked?.kind === "group" ? "group" : "comedian"})
              </p>
            </>
          ) : (
            <Field label="Comedian or group" error={e.performer} hint={admin ? "One comedian or one group. Every profile on Comedy Radar is listed: type part of the name, then pick it." : "One comedian or one group. Only the profiles you manage are listed: type part of the name, then pick it."}>
              {(id, d) => <PerformerPicker id={id} name="performer" profiles={profiles} value={performer} onChange={setPerformer} describedBy={d} invalid={!!e.performer} />}
            </Field>
          )}
        </section>

        {/* 2. Tour details */}
        <section aria-labelledby="details" className={`${card} flex flex-col gap-4`}>
          <h2 id="details" className="text-heading font-extrabold">
            2. Tour details
          </h2>
          <Field label="Tour name" error={e.name}>
            {(id, d) => <input id={id} name="name" maxLength={120} value={name} onChange={(ev) => setName(ev.target.value)} aria-describedby={d} aria-invalid={e.name ? true : undefined} className={inputCls} />}
          </Field>
          <Field label="Description" error={e.description} optional hint="Shown on the tour page and on each date.">
            {(id, d) => <textarea id={id} name="description" rows={4} maxLength={2000} value={description} onChange={(ev) => setDescription(ev.target.value)} aria-describedby={d} className={`${inputCls} py-3`} />}
          </Field>
          <Field label="Poster" error={e.poster} optional hint="Portrait 4:5 works best (for example 1080 × 1350). JPG, PNG or WebP, up to 10 MB.">
            {(id, d) => (
              <input
                id={id}
                name="poster"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby={d}
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) setPoster(URL.createObjectURL(f));
                }}
                className="max-w-full text-base file:mr-3 file:min-h-11 file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-4 file:font-extrabold file:text-radar-purple"
              />
            )}
          </Field>
        </section>

        {/* 3. Tour dates */}
        <section ref={datesRef} aria-labelledby="dates" className={`${card} flex scroll-mt-6 flex-col gap-4`}>
          <h2 id="dates" className="text-heading font-extrabold">
            3. {tour ? "Add dates" : "Tour dates"}
          </h2>
          <p className="-mt-2 text-sm text-radar-purple/75">Each date is saved as its own show on the tour. Times are in Cairo time. Dates without a ticket link say “Tickets soon”.</p>

          {tour && tour.dates.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className={labelCls}>Dates on this tour</p>
              <ul className="flex flex-col divide-y divide-radar-purple/10 rounded-button border border-radar-purple/15">
                {tour.dates.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-bold">{formatShowDate(new Date(d.starts_at))}</span> · {[d.venue_name, d.city_name].filter(Boolean).join(", ") || "Venue to be announced"}
                      {d.status !== "published" && <span className="text-radar-purple/70"> · {d.status === "sold_out" ? "Sold out" : d.status === "pending" ? "In review" : d.status === "draft" ? "Draft" : "Cancelled"}</span>}
                      {d.status === "published" && !d.ticket_url && <span className="text-radar-purple/70"> · No ticket link</span>}
                    </span>
                    <Link href={admin ? `/admin/shows/${d.id}/edit` : `/dashboard/shows/${d.id}/edit`} aria-label={`Edit the ${formatShowDate(new Date(d.starts_at))} date`} title="Edit date" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button hover:bg-lavender">
                      <LinkPending><EditIcon /></LinkPending>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {e.dates && <p className={errorCls}>{e.dates}</p>}
          <ol className="flex flex-col gap-3">
            {rows.map((r, i) => (
              <DateRow
                key={r.key}
                n={i + 1}
                row={r}
                errors={state.dateErrors?.[i]}
                byCountry={byCountry}
                venues={venues.filter((v) => v.city_id === r.city_id)}
                onChange={(patch) => update(r.key, patch)}
                onRemove={() => removeRow(r.key)}
              />
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addRow} disabled={rows.length >= MAX_TOUR_DATES} className={outlineBtn}>
              + Add a date
            </button>
          </div>

          <details className="rounded-button bg-lavender p-3">
            <summary className="min-h-11 cursor-pointer content-center font-extrabold">Paste several dates</summary>
            <div className="mt-2 flex flex-col gap-2">
              <PasteBox value={paste} onChange={setPaste} />
              <button type="button" onClick={addPasted} disabled={!paste.trim()} className={`${outlineBtn} self-start bg-white`}>
                Add these dates
              </button>
              {pasteNote && (
                <p role="status" className="text-sm font-bold">
                  {pasteNote}
                </p>
              )}
            </div>
          </details>

          {myImportable.length > 0 && (
            <fieldset className="flex flex-col gap-1 rounded-button border border-radar-purple/15 p-3">
              <legend className={`${labelCls} px-1`}>Import my existing shows</legend>
              <p className="text-sm text-radar-purple/75">Upcoming shows of {picked?.name} that are not on a tour yet. Ticked shows join this tour as they are.</p>
              {myImportable.map((s) => (
                <label key={s.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="import_ids"
                    value={s.id}
                    checked={imports.has(s.id)}
                    onChange={() =>
                      setImports((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      })
                    }
                    className="h-5 w-5 shrink-0 accent-radar-purple"
                  />
                  <span>
                    <span className="font-bold">{formatShowDate(new Date(s.starts_at))}</span> · {s.title}
                    {s.city_name ? ` · ${s.city_name}` : ""}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </section>

        {/* 4. Same for every date (remounted after an error so the typed values come back) */}
        <section key={state.attempt ?? 0} aria-labelledby="same" className={`${card} flex flex-col gap-4`}>
          <h2 id="same" className="text-heading font-extrabold">
            4. Same for every {tour ? "new " : ""}date
          </h2>
          <Field label="Show title" error={e.title_pattern} hint="[Tour] is filled in with the tour name. The city already shows on each card, so you don't need to add it.">
            {(id, d) => <input id={id} name="title_pattern" maxLength={120} defaultValue={back?.title_pattern ?? DEFAULT_TITLE_PATTERN} aria-describedby={d} className={inputCls} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price from" optional error={e.price}>
              {(id, d) => <input id={id} name="price_min" inputMode="decimal" maxLength={10} defaultValue={back?.price_min ?? ""} aria-describedby={d} className={inputCls} />}
            </Field>
            <Field label="Price to" optional>
              {(id) => <input id={id} name="price_max" inputMode="decimal" maxLength={10} defaultValue={back?.price_max ?? ""} className={inputCls} />}
            </Field>
            <Field label="Currency" error={e.currency}>
              {(id) => (
                <select id={id} name="currency" defaultValue={back?.currency ?? "EGP"} className={inputCls}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Language" optional error={e.language}>
              {(id) => (
                <select id={id} name="language" defaultValue={back?.language ?? ""} className={inputCls}>
                  <option value="">Choose a language</option>
                  {SHOW_LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Age" optional error={e.age_rating}>
              {(id) => (
                <select id={id} name="age_rating" defaultValue={back?.age_rating ?? ""} className={inputCls}>
                  <option value="">Choose an age</option>
                  {AGE_RATINGS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Doors open" optional>
              {(id) => (
                <select id={id} name="doors" defaultValue={back?.doors ?? ""} className={inputCls}>
                  {DOORS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <MemberPicker initial={[]} label="Guests on every date" hint="Tag comedians who join the whole tour. Those who manage their own page are asked first." listLabel="Guests to tag" />
          <p className="text-sm text-radar-purple/75">Prices show only on the show pages, never on cards. You can change any single date later.</p>
        </section>

        {admin ? (
          <AdminSaveRow
            noun="tour"
            pending={pending}
            editing={!!tour}
            defaultStatus={tour?.status}
            extraStatuses={tour ? [{ value: "archived", label: "Archived" }] : []}
          />
        ) : (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SubmitButton type="submit" name="intent" value="publish" disabled={pending} className={`${yellowBtn} min-h-12 px-6`}>
            {pending ? "Saving…" : publishLabel}
          </SubmitButton>
          {!live && (
            <SubmitButton type="submit" name="intent" value="draft" disabled={pending} className={`${outlineBtn} min-h-12 px-6`}>
              Save draft
            </SubmitButton>
          )}
          {picked && !picked.verified && !live && <p className="text-sm text-radar-purple/75">{picked.name} isn&apos;t verified yet, so Comedy Radar checks the tour before it goes live.</p>}
        </div>
        )}
      </div>

      <aside aria-label="Preview" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Live preview</p>
          <div className="rounded-card bg-radar-purple p-3 text-white [&_article]:w-auto" inert>
            <TourCard tour={preview} />
          </div>
        </div>
        <div className={`${card} flex flex-col gap-2`}>
          <p className="font-extrabold">Before you publish</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${c.ok ? "bg-spotlight-yellow" : "border-2 border-radar-purple/30"}`}>
                  {c.ok ? "✓" : ""}
                </span>
                <span className={c.ok ? "" : "text-radar-purple/75"}>
                  {c.label}
                  <span className="sr-only">{c.ok ? " (done)" : " (not yet)"}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-radar-purple/70">Only the date and the city are needed to save a date.</p>
        </div>
      </aside>
    </form>
  );
}

function PasteBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        One date per line
      </label>
      <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
        Date, time, city, then the venue if you know it. For example: 2026-12-04 20:30 Dubai, Coca-Cola Arena
      </p>
      <textarea id={id} rows={4} value={value} onChange={(ev) => onChange(ev.target.value)} aria-describedby={`${id}-hint`} className={`${inputCls} bg-white py-3`} />
    </div>
  );
}

function DateRow({
  n,
  row,
  errors,
  byCountry,
  venues,
  onChange,
  onRemove,
}: {
  n: number;
  row: Row;
  errors?: Record<string, string | undefined>;
  byCountry: [string, CityOption[]][];
  venues: VenueOption[];
  onChange: (patch: Partial<TourDateInput>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const err = errors ?? {};
  const messages = [err.date, err.time, err.doors, err.city_id, err.venue, err.ticket_url].filter(Boolean);
  const f = (k: string) => `${id}-${k}`;
  const small = "text-xs font-extrabold text-radar-purple/80";
  return (
    <li className={`flex flex-col gap-2 rounded-button border p-3 ${messages.length ? "border-laugh-pink" : "border-radar-purple/15"}`}>
      <div className="flex items-center justify-between">
        <p className="font-extrabold">Date {n}</p>
        <button type="button" onClick={onRemove} aria-label={`Remove date ${n}`} title="Remove date" className="inline-flex h-11 w-11 items-center justify-center rounded-button hover:bg-lavender">
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 2xl:grid-cols-[160px_170px_minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-1">
          <label htmlFor={f("date")} className={small}>
            Date
          </label>
          <input id={f("date")} name="d_date" type="date" value={row.date} onChange={(ev) => onChange({ date: ev.target.value })} aria-invalid={err.date ? true : undefined} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={f("time")} className={small}>
            Show time
          </label>
          <input id={f("time")} name="d_time" type="time" value={row.time} onChange={(ev) => onChange({ time: ev.target.value })} aria-invalid={err.time ? true : undefined} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={f("city")} className={small}>
            City
          </label>
          <select id={f("city")} name="d_city" value={row.city_id} onChange={(ev) => onChange({ city_id: ev.target.value, venue_id: "", venue_name: "" })} aria-invalid={err.city_id ? true : undefined} className={inputCls}>
            <option value="">Choose a city</option>
            {byCountry.map(([country, list]) => (
              <optgroup key={country} label={country}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={f("venue")} className={small}>
            Venue
          </label>
          <select id={f("venue")} name="d_venue" value={row.venue_id} disabled={!row.city_id} onChange={(ev) => onChange({ venue_id: ev.target.value })} aria-invalid={err.venue ? true : undefined} className={inputCls}>
            <option value="">{row.city_id ? "No venue yet" : "Choose the city first"}</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.pending ? " (waiting for review)" : ""}
              </option>
            ))}
          </select>
          {/* A disabled select sends nothing; keep every column the same length. */}
          {!row.city_id && <input type="hidden" name="d_venue" value="" />}
        </div>
      </div>
      <input type="hidden" name="d_venue_name" value="" />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="flex flex-col gap-1">
          <label htmlFor={f("ticket")} className={small}>
            Ticket link
          </label>
          <input
            id={f("ticket")}
            name="d_ticket"
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://"
            value={row.ticket_url}
            disabled={row.ticket_status === "no_link"}
            onChange={(ev) => onChange({ ticket_url: ev.target.value })}
            aria-invalid={err.ticket_url ? true : undefined}
            className={inputCls}
          />
          {row.ticket_status === "no_link" && <input type="hidden" name="d_ticket" value="" />}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={f("status")} className={small}>
            Tickets
          </label>
          <select id={f("status")} name="d_status" value={row.ticket_status} onChange={(ev) => onChange({ ticket_status: ev.target.value })} className={inputCls}>
            {TICKET_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {messages.length > 0 && (
        <ul className={errorCls}>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
