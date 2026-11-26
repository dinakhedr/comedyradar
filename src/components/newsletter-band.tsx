"use client";

import { useState } from "react";

/**
 * Yellow newsletter band (spec 5.7). Saving emails comes in phase 1 step 6;
 * until then the form explains that sign-ups open soon.
 */
export function NewsletterBand() {
  const [note, setNote] = useState<string | null>(null);
  return (
    <section className="bg-spotlight-yellow text-radar-purple" aria-labelledby="newsletter-title">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-[18px] py-10 md:px-8 md:py-[52px]">
        <div className="flex flex-[1_1_420px] flex-col gap-2">
          <h2 id="newsletter-title" className="font-display text-[28px] md:text-[40px]">
            Get every new signal
          </h2>
          <p className="text-base md:text-lg">New shows and tours in your inbox, every Thursday.</p>
        </div>
        <form
          className="flex flex-[1_1_380px] flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setNote("Thanks! Sign-ups open very soon. Follow @comedy_radar on Instagram in the meantime.");
          }}
        >
          <div className="flex flex-wrap gap-2.5">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="name@email.com"
              autoComplete="email"
              className="min-h-12 flex-[1_1_220px] rounded-button border-2 border-radar-purple bg-white px-4 text-base text-radar-purple placeholder:text-radar-purple/60"
            />
            <button
              type="submit"
              className="min-h-12 rounded-button bg-radar-purple px-6 text-base font-extrabold text-spotlight-yellow hover:bg-radar-plum"
            >
              Subscribe
            </button>
          </div>
          <p role="status" className="min-h-5 text-small font-bold">
            {note}
          </p>
        </form>
      </div>
    </section>
  );
}
