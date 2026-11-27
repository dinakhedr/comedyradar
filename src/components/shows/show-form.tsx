"use client";

import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { adminSaveShow, saveShow, type ShowState } from "@/app/actions/shows";
import { AdminSaveRow } from "@/components/admin/admin-save-row";
import { errorCls, FormMessage, inputCls, labelCls } from "@/components/auth/fields";
import { card, outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { MemberPicker } from "@/components/profiles/create-form";
import { ShowCard } from "@/components/show-card";
import type { ShowRow } from "@/lib/data/types";
import type { ManagedProfile } from "@/lib/dashboard";
import type { CityOption, EditableShow, TourOption, VenueOption } from "@/lib/data/my-shows";
import { AGE_RATINGS, cairoToIso, CURRENCIES, isoToCairo, MAX_GOOD_TO_KNOW, SHOW_LANGUAGES, SIGNAL_REQUESTS } from "@/lib/show-forms";
import { SubmitButton } from "@/components/submit-button";

const Optional = () => <span className="font-bold text-radar-purple/70"> (optional)</span>;

export function Field({ label, error, hint, optional, children }: { label: string; error?: string; hint?: string; optional?: boolean; children: (id: string, describedBy?: string) => React.ReactNode }) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
        {optional && <Optional />}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
          {hint}
        </p>
      )}
      {children(id, describedBy)}
      {error && (
        <p id={`${id}-err`} className={errorCls}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Add or edit a show, with a live preview of its card (spec 11.4 item 4). */
export function ShowForm({
  profiles,
  cities,
  venues,
  tours,
  show,
  copy,
  defaultPerformer,
  admin = false,
}: {
  profiles: ManagedProfile[];
  cities: CityOption[];
  venues: VenueOption[];
  tours: TourOption[];
  /** Admin > Add new show: any profile, and a status to pick. */
  admin?: boolean;
  /** Editing this show. */
  show?: EditableShow | null;
  /** A show to copy (Duplicate): everything but the date. */
  copy?: EditableShow | null;
  defaultPerformer?: string;
}) {
  const [state, action, pending] = useActionState<ShowState, FormData>(admin ? adminSaveShow : saveShow, {});
  const e = state.errors ?? {};
  const src = show ?? copy ?? null;
  // What was typed, sent back when the form had errors (React clears the other fields after a submit).
  const back = state.input;
  const when = show ? isoToCairo(show.starts_at) : { date: "", time: copy ? isoToCairo(copy.starts_at).time : "" };
  const doors = show?.doors_at ? isoToCairo(show.doors_at).time : copy?.doors_at ? isoToCairo(copy.doors_at).time : "";

  const [performer, setPerformer] = useState(src?.performer ?? defaultPerformer ?? (profiles.length === 1 ? `${profiles[0].kind === "group" ? "g" : "c"}:${profiles[0].id}` : ""));
  const [title, setTitle] = useState(src?.title ?? "");
  const [date, setDate] = useState(when.date);
  const [time, setTime] = useState(when.time);
  const [cityId, setCityId] = useState(src?.city_id ?? "");
  const [venueId, setVenueId] = useState(src?.venue_id ?? "");
  const [ticket, setTicket] = useState(src?.ticket_url ?? "");
  const [poster, setPoster] = useState<string | null>(src?.poster_url ?? null);
  const [lineup, setLineup] = useState(show?.lineup ?? []);
  // A week from now, for the preview until a date is picked.
  const [placeholderIso] = useState(() => new Date(Date.now() + 7 * 86_400_000).toISOString());

  useEffect(() => () => {
    if (poster?.startsWith("blob:")) URL.revokeObjectURL(poster);
  }, [poster]);

  const cityVenues = venues.filter((v) => v.city_id === cityId);
  const byCountry = useMemo(() => {
    const m = new Map<string, CityOption[]>();
    for (const c of cities) m.set(c.country_name, [...(m.get(c.country_name) ?? []), c]);
    return [...m.entries()];
  }, [cities]);
  const picked = profiles.find((p) => `${p.kind === "group" ? "g" : "c"}:${p.id}` === performer);
  const pickedTours = tours.filter((t) => (picked?.kind === "group" ? t.group_id === picked.id : t.comedian_id === picked?.id));
  const city = cities.find((c) => c.id === cityId);

  // The preview uses the public card, so it looks exactly like the listings.
  const startsIso = cairoToIso(date, time) ?? placeholderIso;
  const preview: ShowRow = {
    id: "preview",
    slug: "preview",
    title: title.trim() || "Your show title",
    starts_at: startsIso,
    status: show?.status === "sold_out" ? "sold_out" : "published",
    zone: city && !city.is_market ? "outbound" : "local",
    display_signal: "new",
    ticket_url: ticket.trim() || null,
    poster_url: poster,
    tour_id: null,
    city_name: city?.name ?? "City",
    city_slug: "preview",
    country_code: "",
    venue_name: venues.find((v) => v.id === venueId)?.name ?? null,
    headliner_type: picked?.kind ?? null,
    headliner_name: picked?.name ?? null,
    headliner_slug: null,
    headliner_photo_url: null,
    comedian_ids: [],
    group_ids: [],
    performer_count: 1 + lineup.length,
  };

  const verifiedPick = !!picked?.verified;
  const publishLabel = show && show.status !== "draft" ? "Save changes" : verifiedPick ? "Publish" : "Send for review";

  return (
    <form key={state.attempt ?? 0} action={action} className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start" noValidate>
      {show && <input type="hidden" name="show_id" value={show.id} />}
      <div className="flex min-w-0 flex-col gap-6">
        <FormMessage message={state.message} />

        <section aria-labelledby="who" className={`${card} flex flex-col gap-4`}>
          <h2 id="who" className="text-heading font-extrabold">
            Who is performing
          </h2>
          <Field label="Performer" error={e.performer} hint={admin ? "Every comedian and group on Comedy Radar. Type a name to jump to it." : "Only the profiles you manage are listed."}>
            {(id, d) => (
              <select id={id} name="performer" value={performer} onChange={(ev) => setPerformer(ev.target.value)} aria-describedby={d} aria-invalid={e.performer ? true : undefined} className={inputCls}>
                <option value="">Choose a profile</option>
                {profiles.map((p) => (
                  <option key={p.id} value={`${p.kind === "group" ? "g" : "c"}:${p.id}`}>
                    {p.name} ({p.kind === "group" ? "group" : "comedian"})
                  </option>
                ))}
              </select>
            )}
          </Field>
          {lineup.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className={labelCls}>Also in the lineup</p>
              <ul className="flex flex-wrap gap-2">
                {lineup.map((m) => (
                  <li key={m.id} className="flex items-center gap-1 rounded-full bg-lavender py-1 pr-1 pl-3 text-sm font-bold">
                    {m.name}
                    {m.link_status === "pending" && " · waiting"}
                    <input type="hidden" name="keep_lineup" value={m.id} />
                    <button type="button" onClick={() => setLineup((l) => l.filter((x) => x.id !== m.id))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white">
                      <span aria-hidden="true">×</span>
                      <span className="sr-only">Remove {m.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <MemberPicker
            initial={[]}
            label="Add comedians to the lineup"
            hint="Tag other comedians on the bill. Those who manage their own page are asked first, and show once they accept."
            listLabel="Comedians to tag"
          />
        </section>

        <section aria-labelledby="about" className={`${card} flex flex-col gap-4`}>
          <h2 id="about" className="text-heading font-extrabold">
            The show
          </h2>
          <Field label="Show title" error={e.title}>
            {(id, d) => <input id={id} name="title" maxLength={120} value={title} onChange={(ev) => setTitle(ev.target.value)} aria-describedby={d} aria-invalid={e.title ? true : undefined} className={inputCls} />}
          </Field>
          <Field label="Description" error={e.description} optional>
            {(id, d) => <textarea id={id} name="description" rows={4} maxLength={2000} defaultValue={back?.description ?? src?.description ?? ""} aria-describedby={d} className={`${inputCls} py-3`} />}
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

        <section aria-labelledby="whenwhere" className={`${card} flex flex-col gap-4`}>
          <h2 id="whenwhere" className="text-heading font-extrabold">
            When and where
          </h2>
          <p className="-mt-2 text-sm text-radar-purple/75">Times are in Cairo time, like everywhere on Comedy Radar.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" error={e.date}>
              {(id, d) => <input id={id} name="date" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} aria-describedby={d} aria-invalid={e.date ? true : undefined} className={inputCls} />}
            </Field>
            <Field label="Show time" error={e.time}>
              {(id, d) => <input id={id} name="time" type="time" value={time} onChange={(ev) => setTime(ev.target.value)} aria-describedby={d} aria-invalid={e.time ? true : undefined} className={inputCls} />}
            </Field>
            <Field label="Doors open" error={e.doors} optional>
              {(id, d) => <input id={id} name="doors" type="time" defaultValue={back?.doors ?? doors} aria-describedby={d} aria-invalid={e.doors ? true : undefined} className={inputCls} />}
            </Field>
          </div>
          <Field label="City" error={e.city_id}>
            {(id, d) => (
              <select
                id={id}
                name="city_id"
                value={cityId}
                onChange={(ev) => {
                  setCityId(ev.target.value);
                  setVenueId("");
                }}
                aria-describedby={d}
                aria-invalid={e.city_id ? true : undefined}
                className={inputCls}
              >
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
            )}
          </Field>
          <Field label="Venue" error={e.venue} optional hint={cityId ? (admin ? "Pick the venue. Not on the list? Add it first under Shows and tours > Venues." : "Pick the venue. Not on the list? Contact Comedy Radar and we will add it.") : "Choose the city first."}>
            {(id, d) => (
              <select id={id} name="venue_id" value={venueId} disabled={!cityId} onChange={(ev) => setVenueId(ev.target.value)} aria-describedby={d} className={inputCls}>
                <option value="">No venue yet</option>
                {cityVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.pending ? " (waiting for review)" : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </section>

        <section aria-labelledby="tickets" className={`${card} flex flex-col gap-4`}>
          <h2 id="tickets" className="text-heading font-extrabold">
            Tickets
          </h2>
          <Field label="Ticket link" error={e.ticket_url} optional hint="Where people buy tickets. Without a link the show says “Tickets soon”.">
            {(id, d) => <input id={id} name="ticket_url" type="url" inputMode="url" maxLength={500} value={ticket} onChange={(ev) => setTicket(ev.target.value)} placeholder="https://" aria-describedby={d} aria-invalid={e.ticket_url ? true : undefined} className={inputCls} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price from" optional error={e.price}>
              {(id, d) => <input id={id} name="price_min" inputMode="decimal" maxLength={10} defaultValue={back?.price_min ?? src?.price_min ?? ""} aria-describedby={d} className={inputCls} />}
            </Field>
            <Field label="Price to" optional>
              {(id) => <input id={id} name="price_max" inputMode="decimal" maxLength={10} defaultValue={back?.price_max ?? src?.price_max ?? ""} className={inputCls} />}
            </Field>
            <Field label="Currency" error={e.currency}>
              {(id) => (
                <select id={id} name="currency" defaultValue={back?.currency ?? src?.currency ?? "EGP"} className={inputCls}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <p className="-mt-2 text-sm text-radar-purple/75">Prices show only on the show page, never on cards.</p>
        </section>

        <section aria-labelledby="extra" className={`${card} flex flex-col gap-4`}>
          <h2 id="extra" className="text-heading font-extrabold">
            More details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Language" optional error={e.language}>
              {(id) => (
                <select id={id} name="language" defaultValue={back?.language ?? src?.language ?? ""} className={inputCls}>
                  <option value="">Choose a language</option>
                  {SHOW_LANGUAGES.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Age" optional error={e.age_rating}>
              {(id) => (
                <select id={id} name="age_rating" defaultValue={back?.age_rating ?? src?.age_rating ?? ""} className={inputCls}>
                  <option value="">Choose an age</option>
                  {AGE_RATINGS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label="Good to know" optional error={e.good_to_know} hint={`One per line, up to ${MAX_GOOD_TO_KNOW}: seating, parking, refunds, photo rules…`}>
            {(id, d) => <textarea id={id} name="good_to_know" rows={3} maxLength={900} defaultValue={back?.good_to_know ?? (src?.good_to_know ?? []).join("\n")} aria-describedby={d} className={`${inputCls} py-3`} />}
          </Field>
          {pickedTours.length > 0 && (
            <Field label="Part of a tour" optional error={e.tour_id}>
              {(id) => (
                <select id={id} name="tour_id" defaultValue={back?.tour_id ?? src?.tour_id ?? ""} className={inputCls}>
                  <option value="">Not part of a tour</option>
                  {pickedTours.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          {!admin && (
          <Field label="Signal" optional hint="New shows get the “New” signal. Ask for Strong or Fading and Comedy Radar decides.">
            {(id, d) => (
              <select id={id} name="signal_request" defaultValue={back?.signal_request ?? src?.signal_request ?? ""} aria-describedby={d} className={inputCls}>
                <option value="">No request</option>
                {SIGNAL_REQUESTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          )}
        </section>

        {admin ? (
          <AdminSaveRow noun="show" pending={pending} />
        ) : (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SubmitButton type="submit" name="intent" value="publish" disabled={pending} className={`${yellowBtn} min-h-12 px-6`}>
            {pending ? "Saving…" : publishLabel}
          </SubmitButton>
          {(!show || show.status === "draft") && (
            <SubmitButton type="submit" name="intent" value="draft" disabled={pending} className={`${outlineBtn} min-h-12 px-6`}>
              Save draft
            </SubmitButton>
          )}
          {picked && !verifiedPick && (!show || show.status === "draft") && (
            <p className="text-sm text-radar-purple/75">{picked.name} isn&apos;t verified yet, so Comedy Radar checks the show before it goes live.</p>
          )}
        </div>
        )}
      </div>

      <aside aria-label="Preview" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6">
        <p className="text-sm font-extrabold tracking-wider text-radar-purple/75 uppercase">Live preview</p>
        <div className="rounded-card bg-radar-purple p-3 text-white" inert>
          <ShowCard show={preview} now={new Date()} />
        </div>
        <p className="text-sm text-radar-purple/75">This is how your show appears in the listings.</p>
      </aside>
    </form>
  );
}
