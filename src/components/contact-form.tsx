"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendContactMessage } from "@/app/actions/contact";
import {
  CONTACT_IDLE,
  CONTACT_TOPICS,
  SENDER_TYPES,
  type ContactTopic,
} from "@/lib/contact";
import { SubmitButton } from "@/components/submit-button";

const label = "text-[15px] font-extrabold";
const field =
  "min-h-12 w-full rounded-button border-2 border-transparent bg-white px-4 text-base text-radar-purple placeholder:text-radar-purple/60 aria-[invalid=true]:border-laugh-pink";
const err = "text-small font-bold text-laugh-pink";

/** Contact form (spec 7.5 item 3). Topic and page link can arrive filled in from "Report a correction". */
export function ContactForm({
  topic,
  page,
}: {
  topic: ContactTopic | "";
  page: string;
}) {
  const [state, action, pending] = useActionState(
    sendContactMessage,
    CONTACT_IDLE,
  );
  // When the form appeared; forms sent within a second or two are treated as bots.
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const send = (form: FormData) => {
    form.set("started", String(started.current || ""));
    return action(form);
  };
  const e = state.errors ?? {};
  const v = state.values;

  if (state.status === "ok") {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-card bg-radar-plum p-6 md:p-8"
      >
        <h2 className="font-display text-[28px] leading-none text-spotlight-yellow md:text-display-md">
          Message sent
        </h2>
        <p className="text-base leading-relaxed text-lavender">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form
      action={send}
      noValidate
      className="flex flex-col gap-4 rounded-card bg-radar-plum p-5 md:p-8"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ct-name" className={label}>
            Your name
          </label>
          <input
            id="ct-name"
            name="name"
            defaultValue={v?.name}
            required
            maxLength={100}
            autoComplete="name"
            aria-invalid={!!e.name || undefined}
            aria-describedby={e.name ? "ct-name-err" : undefined}
            className={field}
          />
          {e.name && (
            <p id="ct-name-err" className={err}>
              {e.name}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ct-email" className={label}>
            Your email
          </label>
          <input
            id="ct-email"
            name="email"
            defaultValue={v?.email}
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="name@email.com"
            aria-invalid={!!e.email || undefined}
            aria-describedby={e.email ? "ct-email-err" : undefined}
            className={field}
          />
          {e.email && (
            <p id="ct-email-err" className={err}>
              {e.email}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ct-type" className={label}>
            I am
          </label>
          <select
            id="ct-type"
            name="sender_type"
            defaultValue={v?.sender_type || "fan"}
            className={field}
          >
            {SENDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ct-topic" className={label}>
            Topic
          </label>
          <select
            id="ct-topic"
            name="topic"
            defaultValue={v?.topic || topic || "other"}
            className={field}
          >
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ct-page" className={label}>
          Link to the page{" "}
          <span className="font-normal text-lavender-text">(optional)</span>
        </label>
        <input
          id="ct-page"
          name="page_url"
          type="url"
          maxLength={500}
          defaultValue={v ? v.page_url : page}
          placeholder="https://"
          aria-invalid={!!e.page_url || undefined}
          aria-describedby={e.page_url ? "ct-page-err" : undefined}
          className={field}
        />
        {e.page_url && (
          <p id="ct-page-err" className={err}>
            {e.page_url}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ct-message" className={label}>
          Message
        </label>
        <textarea
          id="ct-message"
          name="message"
          defaultValue={v?.message}
          required
          rows={6}
          maxLength={4000}
          aria-invalid={!!e.message || undefined}
          aria-describedby={e.message ? "ct-message-err" : undefined}
          className={`${field} py-3`}
        />
        {e.message && (
          <p id="ct-message-err" className={err}>
            {e.message}
          </p>
        )}
      </div>
      {/* Bot trap: people never see or fill this field. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="ct-website">Website</label>
        <input
          id="ct-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-[15px] leading-snug">
          <input
            type="checkbox"
            name="consent"
            value="yes"
            required
            aria-invalid={!!e.consent || undefined}
            aria-describedby={e.consent ? "ct-consent-err" : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-spotlight-yellow"
          />
          <span>
            Comedy Radar can use my name and email to reply to this message. See
            the{" "}
            <a
              href="/privacy"
              className="font-bold text-spotlight-yellow underline hover:text-white"
            >
              privacy policy
            </a>
            .
          </span>
        </label>
        {e.consent && (
          <p id="ct-consent-err" className={err}>
            {e.consent}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <SubmitButton
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-button bg-spotlight-yellow px-8 text-base font-extrabold text-radar-purple hover:bg-white disabled:opacity-70"
        >
          {pending ? "Sending…" : "Send message"}
        </SubmitButton>
        <p role="status" className="text-small font-bold text-lavender">
          {state.status !== "idle" ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
