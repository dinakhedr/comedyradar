"use client";

import Link from "next/link";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import {
  answerParts,
  FAQ,
  FAQ_TOPICS,
  filterFaq,
  type FaqTopic,
} from "@/lib/faq";

const chip =
  "inline-flex min-h-11 items-center rounded-full border-2 px-4 text-[15px] font-bold";

/** FAQ search, topic chips and the questions grouped by topic, one open at a time (spec 7.5 item 2). */
export function FaqList() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<FaqTopic | "">("");
  const [open, setOpen] = useState<string | null>(null);
  const items = filterFaq(FAQ, q, topic);

  return (
    <div className="flex flex-col gap-6">
      <div
        role="search"
        className="flex w-full gap-2 rounded-2xl bg-white p-1.5"
      >
        <label htmlFor="faq-search" className="sr-only">
          Search the questions
        </label>
        <input
          id="faq-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the questions"
          className="min-w-0 flex-1 rounded-button px-4 py-3 text-base text-radar-purple placeholder:text-radar-purple/60"
        />
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-button bg-radar-purple text-spotlight-yellow"
        >
          <SearchIcon />
        </span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Topics">
        {[{ value: "" as const, label: "All" }, ...FAQ_TOPICS].map((t) => {
          const on = topic === t.value;
          return (
            <button
              key={t.value || "all"}
              type="button"
              aria-pressed={on}
              onClick={() => setTopic(t.value)}
              className={`${chip} ${on ? "border-spotlight-yellow bg-spotlight-yellow text-radar-purple" : "border-plum-line hover:border-spotlight-yellow"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {items.length === 1 ? "1 question" : `${items.length} questions`}
      </p>

      {items.length === 0 ? (
        <p className="rounded-card bg-radar-plum p-5 text-lavender">
          No question matches &quot;{q}&quot;. Try another word, or{" "}
          <Link
            href="/contact"
            className="font-bold text-spotlight-yellow underline hover:text-white"
          >
            ask us directly
          </Link>
          .
        </p>
      ) : (
        FAQ_TOPICS.filter((t) => items.some((i) => i.topic === t.value)).map(
          (t) => (
            <section
              key={t.value}
              aria-labelledby={`faq-${t.value}`}
              className="flex flex-col gap-2.5"
            >
              <h2
                id={`faq-${t.value}`}
                className="text-label font-extrabold tracking-wider text-lavender-text uppercase"
              >
                {t.label}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {items
                  .filter((i) => i.topic === t.value)
                  .map((i) => {
                    const isOpen = open === i.id;
                    return (
                      <li
                        key={i.id}
                        id={i.id}
                        className="scroll-mt-6 rounded-card bg-radar-plum"
                      >
                        <h3>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={`${i.id}-a`}
                            onClick={() => setOpen(open === i.id ? null : i.id)}
                            className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left text-[17px] font-extrabold hover:text-spotlight-yellow"
                          >
                            <span className="flex-1">{i.q}</span>
                            <span
                              aria-hidden="true"
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-plum-deep text-xl text-spotlight-yellow transition-transform ${isOpen ? "rotate-45" : ""}`}
                            >
                              +
                            </span>
                          </button>
                        </h3>
                        <div
                          id={`${i.id}-a`}
                          hidden={!isOpen}
                          className="flex flex-col gap-2 px-5 pb-5 text-base leading-relaxed text-lavender"
                        >
                          {i.a.map((p, n) => (
                            <p key={n}>
                              {answerParts(p).map((part, k) =>
                                "href" in part ? (
                                  <Link
                                    key={k}
                                    href={part.href}
                                    className="font-bold text-spotlight-yellow underline hover:text-white"
                                  >
                                    {part.label}
                                  </Link>
                                ) : (
                                  <span key={k}>{part.text}</span>
                                ),
                              )}
                            </p>
                          ))}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ),
        )
      )}
    </div>
  );
}
