"use client";

import { useActionState, useId } from "react";
import {
  addGroupMembers,
  savePodcast,
  updateProfile,
  type EditState,
  type MembersState,
  type PodcastState,
} from "@/app/actions/profile-edit";
import { errorCls, FormMessage, inputCls, labelCls } from "@/components/auth/fields";
import { card, yellowBtn } from "@/components/dashboard/ui";
import { CoverImage } from "@/components/placeholder-image";
import { MemberPicker, TextField } from "@/components/profiles/create-form";
import { coverOf } from "@/lib/covers";
import { GROUP_LANGUAGES, GROUP_STYLES } from "@/lib/group-styles";
import { PODCAST_LINKS, SOCIAL_FIELDS, type ProfileKind } from "@/lib/profile-forms";

type Country = { id: string; name: string };

export type EditValues = {
  kind: ProfileKind;
  id: string;
  name: string;
  name_ar: string | null;
  bio: string | null;
  photo_url: string | null;
  cover_url: string | null;
  home_country_id: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  styles: string[];
  performing_language: string | null;
  verified: boolean;
};

function Optional() {
  return <span className="font-bold text-radar-purple/70"> (optional)</span>;
}

function TextArea({ label, name, rows, maxLength, defaultValue, error }: { label: string; name: string; rows: number; maxLength: number; defaultValue?: string | null; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
        <Optional />
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputCls} py-3`}
      />
      {error && (
        <p id={`${id}-err`} className={errorCls}>
          {error}
        </p>
      )}
    </div>
  );
}

function ImageField({
  label,
  name,
  hint,
  current,
  removable,
  wide,
  preview,
  error,
}: {
  label: string;
  name: string;
  hint: string;
  current: string | null;
  removable?: boolean;
  wide?: boolean;
  /** What is shown when there is no image yet (the default cover). */
  preview?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <span className={`shrink-0 overflow-hidden ${wide ? "h-20 w-40 rounded-xl" : "h-20 w-20 rounded-full"}`}>
          <CoverImage src={current ?? preview ?? null} alt="" iconSize={28} className="h-full w-full" tone="deep" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
            {hint}
          </p>
          <input
            id={id}
            name={name}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${id}-hint`}
            className="max-w-full text-base file:mr-3 file:min-h-11 file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-4 file:font-extrabold file:text-radar-purple"
          />
          {removable && current && (
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
              <input type="checkbox" name={`remove_${name}`} className="h-5 w-5 accent-radar-purple" />
              Remove the current {wide ? "cover" : "photo"}
            </label>
          )}
        </div>
      </div>
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

/** Photo, names, bio, country, links (and styles and language for groups). */
export function ProfileEditForm({ p, countries }: { p: EditValues; countries: Country[] }) {
  const [state, action, pending] = useActionState<EditState, FormData>(updateProfile, {});
  const e = state.errors ?? {};
  const group = p.kind === "group";
  const ids = { country: useId(), language: useId() };
  const socials = { instagram: p.instagram_url, tiktok: p.tiktok_url, youtube: p.youtube_url, facebook: p.facebook_url };

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="kind" value={p.kind} />
      <input type="hidden" name="profile_id" value={p.id} />

      <section aria-labelledby="details" className={`${card} flex flex-col gap-4`}>
        <h2 id="details" className="text-heading font-extrabold">
          Details
        </h2>
        <ImageField
          label="Photo"
          name="photo"
          hint="A square photo works best. JPG, PNG or WebP, up to 10 MB."
          current={p.photo_url}
          removable
          error={e.photo}
        />
        <ImageField
          label="Cover photo"
          name="cover"
          hint={
            group
              ? "A wide photo for the top of your group page (3:1 works best). Until you add one, the Comedy Radar cover shows. JPG, PNG or WebP, up to 10 MB."
              : "A wide photo (3:1 works best), saved for your page. Until you add one, the Comedy Radar cover is used. JPG, PNG or WebP, up to 10 MB."
          }
          current={p.cover_url}
          preview={coverOf(p.cover_url)}
          removable
          wide
          error={e.cover}
        />
        <TextField label={group ? "Group name in English" : "Name in English"} name="name" required error={e.name} defaultValue={p.name} />
        <TextField label={group ? "Group name in Arabic" : "Name in Arabic"} name="name_ar" lang="ar" dir="rtl" error={e.name_ar} defaultValue={p.name_ar ?? ""} />
        {p.verified && <p className="-mt-2 text-sm text-radar-purple/80">This profile is verified, so a new name shows once Comedy Radar approves it.</p>}
        <TextArea label="Short bio" name="bio" rows={5} maxLength={1500} defaultValue={p.bio} error={e.bio} />
        {countries.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.country} className={labelCls}>
              Home country
              <Optional />
            </label>
            <select id={ids.country} name="country" defaultValue={p.home_country_id ?? ""} className={inputCls}>
              <option value="">Choose a country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {e.country && <p className={errorCls}>{e.country}</p>}
          </div>
        )}
      </section>

      {group && (
        <section aria-labelledby="style" className={`${card} flex flex-col gap-4`}>
          <h2 id="style" className="text-heading font-extrabold">
            Style and language
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className={`${labelCls} mb-1.5`}>
              Comedy styles <span className="font-bold text-radar-purple/70">(pick any)</span>
            </legend>
            <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
              {GROUP_STYLES.map((s) => (
                <label key={s.value} className="flex min-h-11 items-center gap-3 font-bold">
                  <input type="checkbox" name="styles" value={s.value} defaultChecked={p.styles.includes(s.value)} className="h-5 w-5 accent-radar-purple" />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.language} className={labelCls}>
              Performing language
              <Optional />
            </label>
            <select id={ids.language} name="language" defaultValue={p.performing_language ?? ""} className={inputCls}>
              <option value="">Choose a language</option>
              {GROUP_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {e.language && <p className={errorCls}>{e.language}</p>}
          </div>
        </section>
      )}

      <section aria-labelledby="links" className={`${card} flex flex-col gap-4`}>
        <h2 id="links" className="text-heading font-extrabold">
          Social links
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <TextField key={f.key} label={f.label} name={f.key} placeholder={f.placeholder} maxLength={300} error={e[f.key]} defaultValue={socials[f.key] ?? ""} />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <FormMessage message={state.message} tone={state.ok ? "ok" : "error"} />
        <button type="submit" disabled={pending} className={`${yellowBtn} min-h-12 self-start px-6`}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

/** Add group members: comedians on Comedy Radar, or new names. */
export function AddMembersForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState<MembersState, FormData>(addGroupMembers, {});
  const id = useId();
  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-4 border-t border-radar-purple/10 pt-4">
      <input type="hidden" name="kind" value="group" />
      <input type="hidden" name="profile_id" value={groupId} />
      <h3 className="text-lg font-extrabold">Add members</h3>
      <MemberPicker initial={[]} label="Comedians on Comedy Radar" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className={labelCls}>
          New members, not on Comedy Radar yet
          <Optional />
        </label>
        <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
          One name per line, in English. Each one gets a draft page that you manage.
        </p>
        <textarea id={id} name="new_members" rows={2} maxLength={2000} aria-describedby={`${id}-hint`} className={`${inputCls} py-3`} />
      </div>
      <FormMessage message={state.message} tone={state.ok ? "ok" : "error"} />
      <button type="submit" disabled={pending} className={`${yellowBtn} self-start`}>
        {pending ? "Adding…" : "Add members"}
      </button>
    </form>
  );
}

export type PodcastValues = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
} & Record<(typeof PODCAST_LINKS)[number]["key"], string | null>;

/** Add or edit a podcast with its listen links and co-hosts. */
export function PodcastForm({ comedianId, podcast }: { comedianId: string; podcast?: PodcastValues }) {
  const [state, action, pending] = useActionState<PodcastState, FormData>(savePodcast, {});
  const e = state.errors ?? {};
  return (
    <form key={podcast ? "edit" : (state.attempt ?? 0)} action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="kind" value="comedian" />
      <input type="hidden" name="profile_id" value={comedianId} />
      {podcast && <input type="hidden" name="podcast_id" value={podcast.id} />}
      <TextField label="Podcast name" name="name" required error={e.name} defaultValue={podcast?.name} />
      <TextArea label="Short description" name="description" rows={3} maxLength={600} defaultValue={podcast?.description} error={e.description} />
      <ImageField label="Cover art" name="cover" hint="Square, JPG, PNG or WebP, up to 10 MB." current={podcast?.cover_url ?? null} error={e.cover} />
      <fieldset className="flex flex-col gap-3">
        <legend className={`${labelCls} mb-1`}>Where to listen</legend>
        <p className="text-sm text-radar-purple/75">Paste the link of each platform you are on. Only these show on your page.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {PODCAST_LINKS.map((l) => (
            <TextField key={l.key} label={l.label} name={l.key} maxLength={300} error={e[l.key]} defaultValue={podcast?.[l.key] ?? ""} placeholder="https://…" />
          ))}
        </div>
        {e.links && <p className={errorCls}>{e.links}</p>}
      </fieldset>
      <MemberPicker
        initial={[]}
        label="Add co-hosts"
        hint="Co-hosts who manage their own page are asked first, and show once they accept."
        listLabel="Co-hosts to add"
      />
      <FormMessage message={state.message} tone={state.ok ? "ok" : "error"} />
      <button type="submit" disabled={pending} className={`${yellowBtn} self-start`}>
        {pending ? "Saving…" : podcast ? "Save podcast" : "Add podcast"}
      </button>
    </form>
  );
}
