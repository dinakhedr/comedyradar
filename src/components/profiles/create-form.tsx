"use client";

import Link from "next/link";
import { useActionState, useId, useState, useTransition } from "react";
import { adminCreateProfile, createProfile, findComedians, type CreateState } from "@/app/actions/profiles";
import { adminEditPath } from "@/lib/admin-paths";
import { errorCls, FormMessage, inputCls, labelCls } from "@/components/auth/fields";
import { card, outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { DEFAULT_COVER } from "@/lib/covers";
import { GROUP_LANGUAGES, GROUP_STYLES } from "@/lib/group-styles";
import { SOCIAL_FIELDS, type ProfileKind } from "@/lib/profile-forms";
import { SubmitButton } from "@/components/submit-button";
import { AdminSaveRow } from "@/components/admin/admin-save-row";

type Country = { id: string; name: string };

export function TextField({
  label,
  name,
  hint,
  error,
  defaultValue,
  required,
  maxLength = 80,
  lang,
  dir,
  placeholder,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  lang?: string;
  dir?: string;
  placeholder?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
        {!required && <span className="font-bold text-radar-purple/70"> (optional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
        lang={lang}
        dir={dir}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputCls}
      />
      {error && (
        <p id={`${id}-err`} className={errorCls}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Pick comedians already on Comedy Radar (group members, podcast co-hosts). */
export function MemberPicker({
  initial,
  label = "Members already on Comedy Radar",
  hint = "A member who manages their own page is asked first, and shows on the group page once they accept.",
  listLabel = "Members added",
}: {
  initial: { id: string; name: string }[];
  label?: string;
  hint?: string;
  listLabel?: string;
}) {
  const id = useId();
  const [members, setMembers] = useState(initial);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; name: string; status: string }[] | null>(null);
  const [pending, start] = useTransition();

  const search = () => {
    if (q.trim().length < 2) return;
    start(async () => setFound(await findComedians(q)));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className={labelCls}>
        {label} <span className="font-bold text-radar-purple/70">(optional)</span>
      </label>
      <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
        {hint}
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id={id}
          type="search"
          value={q}
          maxLength={80}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          aria-describedby={`${id}-hint`}
          placeholder="Search a comedian's name"
          className={inputCls}
        />
        <button type="button" onClick={search} disabled={pending} className={`${outlineBtn} min-h-12 shrink-0`}>
          {pending ? "Searching…" : "Find"}
        </button>
      </div>
      {found && (
        <div aria-live="polite">
          {found.length === 0 ? (
            <p className="text-sm font-bold">No comedian found with this name.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {found.map((c) => {
                const added = members.some((m) => m.id === c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-button bg-lavender px-3 py-1.5">
                    <span className="font-bold">
                      {c.name}
                      {c.status === "pending" && <span className="text-sm font-normal"> · in review</span>}
                    </span>
                    <button
                      type="button"
                      disabled={added || members.length >= 20}
                      onClick={() => setMembers((m) => [...m, { id: c.id, name: c.name }])}
                      className="min-h-11 rounded-button px-3 text-sm font-extrabold underline disabled:no-underline disabled:opacity-60"
                    >
                      {added ? "Added" : "Add"}
                      <span className="sr-only"> {c.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {members.length > 0 && (
        <ul aria-label={listLabel} className="flex flex-wrap gap-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-1 rounded-full bg-radar-purple py-1 pr-1 pl-3 text-sm font-bold text-white">
              {m.name}
              <input type="hidden" name="member_ids" value={m.id} />
              <input type="hidden" name="member_names" value={m.name} />
              <button
                type="button"
                onClick={() => setMembers((list) => list.filter((x) => x.id !== m.id))}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-radar-plum"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove {m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Create a comedian or group profile (spec 11.3 and 11.4 item 2). */
export function CreateProfileForm({ kind, countries, admin = false }: { kind: ProfileKind; countries: Country[]; admin?: boolean }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(admin ? adminCreateProfile : createProfile, {});
  const e = state.errors ?? {};
  const v = state.input?.fields ?? {};
  const styles = state.input?.styles ?? [];
  const group = kind === "group";
  const ids = { country: useId(), bio: useId(), photo: useId(), cover: useId(), language: useId(), newMembers: useId() };

  return (
    // The key re-fills the fields with what was typed after each answer.
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <FormMessage message={state.message} />

      {state.duplicates && state.duplicates.length > 0 && (
        <section aria-labelledby="dupes" className="flex flex-col gap-3 rounded-card border-2 border-laugh-pink bg-white p-4">
          <h2 id="dupes" className="text-lg font-extrabold">
            Is it one of these?
          </h2>
          <ul className="flex flex-col gap-2">
            {state.duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  {d.name}
                  {d.name_ar && (
                    <span lang="ar" dir="rtl" className="ml-2 text-radar-purple/75">
                      {d.name_ar}
                    </span>
                  )}
                  {d.status === "pending" && <span className="text-sm font-normal"> · waiting for review</span>}
                </span>
                {admin ? (
                  <Link href={adminEditPath(d.kind, d.id)} className={outlineBtn}>
                    Open it<span className="sr-only">: {d.name}</span>
                  </Link>
                ) : d.status === "published" && d.slug && (
                  <Link href={`/dashboard/profiles/claim/${d.kind}/${d.slug}`} className={yellowBtn}>
                    Claim this one<span className="sr-only">: {d.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <label className="flex min-h-11 items-center gap-3 font-bold">
            <input type="checkbox" name="not_duplicate" className="h-5 w-5 accent-radar-purple" />
            {admin ? "No, this is someone else. Create it anyway." : "No, mine is someone else. Create it anyway."}
          </label>
        </section>
      )}

      <section aria-labelledby="basics" className={`${card} flex flex-col gap-4`}>
        <h2 id="basics" className="text-heading font-extrabold">
          {group ? "About the group" : admin ? "About the comedian" : "About you"}
        </h2>
        <TextField label={group ? "Group name in English" : "Name in English"} name="name" required error={e.name} defaultValue={v.name} />
        <TextField label={group ? "Group name in Arabic" : "Name in Arabic"} name="name_ar" lang="ar" dir="rtl" error={e.name_ar} defaultValue={v.name_ar} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.bio} className={labelCls}>
            Short bio <span className="font-bold text-radar-purple/70">(optional)</span>
          </label>
          <textarea
            id={ids.bio}
            name="bio"
            rows={5}
            maxLength={1500}
            defaultValue={v.bio}
            aria-invalid={e.bio ? true : undefined}
            className={`${inputCls} py-3`}
          />
          {e.bio && <p className={errorCls}>{e.bio}</p>}
        </div>
        {countries.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.country} className={labelCls}>
              Home country <span className="font-bold text-radar-purple/70">(optional)</span>
            </label>
            <select id={ids.country} name="country" defaultValue={v.country ?? ""} className={inputCls}>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.photo} className={labelCls}>
            Photo <span className="font-bold text-radar-purple/70">(optional)</span>
          </label>
          <p id={`${ids.photo}-hint`} className="text-sm text-radar-purple/75">
            A square photo works best. JPG, PNG or WebP, up to 10 MB.
          </p>
          <input
            id={ids.photo}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${ids.photo}-hint`}
            className="text-base file:mr-3 file:min-h-11 file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-4 file:font-extrabold file:text-radar-purple"
          />
          {e.photo && <p className={errorCls}>{e.photo}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.cover} className={labelCls}>
            Cover photo <span className="font-bold text-radar-purple/70">(optional)</span>
          </label>
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- the default cover, a local file */}
            <img src={DEFAULT_COVER} alt="" className="h-16 w-48 shrink-0 rounded-xl object-cover object-right" />
            <p id={`${ids.cover}-hint`} className="min-w-0 flex-1 text-sm text-radar-purple/75">
              A wide photo (3:1 works best). Until you add one, the Comedy Radar cover on the left is used. JPG, PNG or WebP, up to
              10 MB.
            </p>
          </div>
          <input
            id={ids.cover}
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${ids.cover}-hint`}
            className="max-w-full text-base file:mr-3 file:min-h-11 file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-4 file:font-extrabold file:text-radar-purple"
          />
          {e.cover && <p className={errorCls}>{e.cover}</p>}
        </div>
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
                  <input type="checkbox" name="styles" value={s.value} defaultChecked={styles.includes(s.value)} className="h-5 w-5 accent-radar-purple" />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.language} className={labelCls}>
              Performing language <span className="font-bold text-radar-purple/70">(optional)</span>
            </label>
            <select id={ids.language} name="language" defaultValue={v.language ?? ""} className={inputCls}>
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

      {group && (
        <section aria-labelledby="members" className={`${card} flex flex-col gap-4`}>
          <h2 id="members" className="text-heading font-extrabold">
            Members
          </h2>
          <MemberPicker initial={state.input?.members ?? []} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.newMembers} className={labelCls}>
              New members, not on Comedy Radar yet <span className="font-bold text-radar-purple/70">(optional)</span>
            </label>
            <p id={`${ids.newMembers}-hint`} className="text-sm text-radar-purple/75">
              {admin
                ? "One name per line, in English. Each one gets a comedian page with the same status as this group."
                : "One name per line, in English. Each one gets a draft page that only you can see for now."}
            </p>
            <textarea
              id={ids.newMembers}
              name="new_members"
              rows={3}
              maxLength={2000}
              defaultValue={v.new_members}
              aria-describedby={`${ids.newMembers}-hint`}
              className={`${inputCls} py-3`}
            />
          </div>
        </section>
      )}

      <section aria-labelledby="links" className={`${card} flex flex-col gap-4`}>
        <h2 id="links" className="text-heading font-extrabold">
          Social links
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <TextField key={f.key} label={f.label} name={f.key} placeholder={f.placeholder} maxLength={300} error={e[f.key]} defaultValue={v[f.key]} />
          ))}
        </div>
      </section>

      {admin ? (
        <AdminSaveRow noun={group ? "group" : "comedian"} pending={pending} defaultStatus={v.status} />
      ) : (
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SubmitButton type="submit" name="intent" value="review" disabled={pending} className={`${yellowBtn} min-h-12 px-6`}>
          {pending ? "Saving…" : "Send for review"}
        </SubmitButton>
        <SubmitButton type="submit" name="intent" value="draft" disabled={pending} className={`${outlineBtn} min-h-12 px-6`}>
          Save draft
        </SubmitButton>
        <p className="text-sm text-radar-purple/75">Comedy Radar checks new profiles before they go live.</p>
      </div>
      )}
    </form>
  );
}
