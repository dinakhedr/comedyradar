"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { claimProfile, type ClaimState } from "@/app/actions/profiles";
import { errorCls, FormMessage, inputCls, labelCls } from "@/components/auth/fields";
import { card, outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { AVAILABLE_PROOFS, CLAIM_RELATIONS, PROOF_METHODS, type ProfileKind } from "@/lib/profile-forms";

const INSTAGRAM = "https://instagram.com/comedy_radar";

/** A link to copy, with a Copy button. */
export function CopyLink({ url, label }: { url: string; label: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id={id} readOnly value={url} onFocus={(e) => e.target.select()} className={`${inputCls} text-sm`} />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className={`${yellowBtn} min-h-12 shrink-0`}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}

function ProofField({ method, error }: { method: string; error?: string }) {
  const id = useId();
  const field = {
    official_dm: { label: "Instagram account you will message from", placeholder: "@yourname", type: "text", auto: "off" },
    comedian_confirms: { label: "Name of the person who will confirm", placeholder: "Their name", type: "text", auto: "off" },
    call: { label: "Phone number we can call", placeholder: "+20 …", type: "tel", auto: "tel" },
  }[method];
  if (method === "document") {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className={labelCls}>
          Document
        </label>
        <input
          id={id}
          name="document"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          aria-invalid={error ? true : undefined}
          className="text-base file:mr-3 file:min-h-11 file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-4 file:font-extrabold file:text-radar-purple"
        />
        <details className="rounded-button bg-lavender px-3 py-2 text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-extrabold">No contract? Use this letter</summary>
          <p className="pb-2">
            Write and sign a short letter like this one, then upload a photo or PDF of it:
            <br />
            <em>
              &ldquo;I, [comedian or group name], authorise [your name] to manage my Comedy Radar page on my behalf.
              Signed, [name], [date], [phone or email].&rdquo;
            </em>
          </p>
        </details>
        {error && <p className={errorCls}>{error}</p>}
      </div>
    );
  }
  if (!field) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {field.label}
      </label>
      <input
        id={id}
        name={`proof_${method}`}
        type={field.type}
        autoComplete={field.auto}
        maxLength={80}
        placeholder={field.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
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

function Done({ done, profileName, email }: { done: NonNullable<ClaimState["done"]>; profileName: string; email: string }) {
  return (
    <section aria-labelledby="sent" className={`${card} flex flex-col gap-4`}>
      <h2 id="sent" className="text-heading font-extrabold" tabIndex={-1}>
        Your claim is sent
      </h2>
      {done.method === "official_dm" && (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base">
          <li>
            Open Instagram on <strong>@{done.handle}</strong>, the official account of {profileName}.
          </li>
          <li>
            Send a message to{" "}
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="font-extrabold underline">
              @comedy_radar
            </a>{" "}
            saying: &ldquo;Please give {email || "my account"} access to {profileName} on Comedy Radar.&rdquo;
          </li>
          <li>We check the message and let you know here.</li>
        </ol>
      )}
      {done.method === "comedian_confirms" && done.confirmUrl && (
        <>
          <p className="text-base">
            Send this private link on WhatsApp or by email to the person who will confirm. They open it, type their name and
            tap Confirm. No account needed.
          </p>
          <CopyLink url={done.confirmUrl} label="Private confirmation link" />
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Please confirm I manage ${profileName} on Comedy Radar: ${done.confirmUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${outlineBtn} self-start`}
          >
            Send on WhatsApp
          </a>
          <p className="text-sm text-radar-purple/75">You can find this link again on your Profiles page.</p>
        </>
      )}
      {done.method === "document" && <p className="text-base">Thanks! Comedy Radar will check your document and let you know here.</p>}
      {done.method === "call" && <p className="text-base">Thanks! The Comedy Radar team will call you soon to confirm.</p>}
      <p className="text-base text-radar-purple/80">Comedy Radar reviews every claim before you get access.</p>
      <Link href="/dashboard/profiles" className={`${yellowBtn} self-start`}>
        Go to my profiles
      </Link>
    </section>
  );
}

/** Claim a profile: who you are and one proof (spec 11.3). */
export function ClaimForm({
  kind,
  profileId,
  profileName,
  email,
}: {
  kind: ProfileKind;
  profileId: string;
  profileName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimProfile, {});
  const [method, setMethod] = useState<string>("official_dm");
  const e = state.errors ?? {};
  const methods = PROOF_METHODS.filter((m) => AVAILABLE_PROOFS.includes(m.value));

  if (state.done) return <Done done={state.done} profileName={profileName} email={email} />;

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="profile_id" value={profileId} />
      <FormMessage message={state.message} />

      <fieldset className={`${card} flex flex-col gap-2`}>
        <legend className="sr-only">Who are you?</legend>
        <p aria-hidden="true" className="mb-1 text-heading font-extrabold">
          Who are you?
        </p>
        {CLAIM_RELATIONS[kind].map((r, i) => (
          <label key={r.value} className="flex min-h-11 items-center gap-3 text-base font-bold">
            <input type="radio" name="relation" value={r.value} defaultChecked={i === 0} className="h-5 w-5 accent-radar-purple" />
            {r.label}
          </label>
        ))}
        {e.relation && <p className={errorCls}>{e.relation}</p>}
      </fieldset>

      <fieldset className={`${card} flex flex-col gap-3`}>
        <legend className="sr-only">How will you prove it?</legend>
        <p aria-hidden="true" className="text-heading font-extrabold">
          How will you prove it?
        </p>
        <p className="text-sm text-radar-purple/75">Pick one. You can send another proof later if needed.</p>
        {methods.map((m) => {
          const on = method === m.value;
          return (
            <div key={m.value} className={`flex flex-col gap-3 rounded-card border-2 p-3 ${on ? "border-radar-purple" : "border-radar-purple/15"}`}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="method"
                  value={m.value}
                  checked={on}
                  onChange={() => setMethod(m.value)}
                  className="mt-1 h-5 w-5 shrink-0 accent-radar-purple"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-extrabold">{m.label}</span>
                  <span className="text-sm text-radar-purple/80">{m.hint}</span>
                </span>
              </label>
              {on && (
                <div className="pl-8">
                  <ProofField method={m.value} error={m.value === "document" ? e.file : e.proof} />
                </div>
              )}
            </div>
          );
        })}
        {e.method && <p className={errorCls}>{e.method}</p>}
        <p className="text-sm text-radar-purple/75">Business email confirmation is coming soon.</p>
      </fieldset>

      <button type="submit" disabled={pending} className={`${yellowBtn} min-h-12 self-start px-6`}>
        {pending ? "Sending…" : "Send my claim"}
      </button>
    </form>
  );
}
