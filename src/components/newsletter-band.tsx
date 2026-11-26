"use client";

import { useActionState, useState } from "react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { NEWSLETTER_IDLE } from "@/lib/newsletter";

/** Yellow newsletter band (spec 5.7): saves the email in newsletter_subscribers. */
export function NewsletterBand() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, NEWSLETTER_IDLE);
  // When the form appeared; forms sent within a second or two are treated as bots.
  const [started] = useState(() => Date.now());
  const done = state.status === "ok";

  return (
    <section className="bg-spotlight-yellow text-radar-purple" aria-labelledby="newsletter-title">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-[18px] py-10 md:px-8 md:py-[52px]">
        <div className="flex flex-[1_1_420px] flex-col gap-2">
          <h2 id="newsletter-title" className="font-display text-[28px] md:text-[40px]">
            Get every new signal
          </h2>
          <p className="text-base md:text-lg">New shows and tours in your inbox, every Thursday.</p>
        </div>
        <form action={action} className="flex flex-[1_1_380px] flex-col gap-2">
          {!done && (
            <div className="flex flex-wrap gap-2.5">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                maxLength={254}
                placeholder="name@email.com"
                autoComplete="email"
                aria-invalid={state.status === "invalid" || undefined}
                aria-describedby="newsletter-note"
                className="min-h-12 flex-[1_1_220px] rounded-button border-2 border-radar-purple bg-white px-4 text-base text-radar-purple placeholder:text-radar-purple/60"
              />
              {/* Bot trap: people never see or fill this field. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="newsletter-website">Website</label>
                <input id="newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>
              <input type="hidden" name="started" value={started} />
              <button
                type="submit"
                disabled={pending}
                className="min-h-12 rounded-button bg-radar-purple px-6 text-base font-extrabold text-spotlight-yellow hover:bg-radar-plum disabled:opacity-70"
              >
                {pending ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
          )}
          <p id="newsletter-note" role="status" className="min-h-5 text-small font-bold md:text-base">
            {state.message}
          </p>
        </form>
      </div>
    </section>
  );
}
