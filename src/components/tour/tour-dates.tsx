"use client";

import Link from "next/link";
import { useState } from "react";
import { trackTicketsClick } from "@/lib/analytics";
import type { TourDate } from "@/lib/data/tour";
import { displaySignal } from "@/lib/show-page";
import { countryCounts, dateTile } from "@/lib/tour-page";
import { Badge } from "../badge";

function DateBadge({ date, now }: { date: TourDate; now: Date }) {
  if (date.status === "cancelled") return <Badge tone="pink">Cancelled</Badge>;
  if (date.status === "sold_out") return <Badge tone="outline">Sold out</Badge>;
  const signal = displaySignal(date.signal, date.created_at, now);
  if (signal === "strong") return <Badge tone="pink">Strong signal</Badge>;
  if (signal === "fading") return <Badge tone="pink">Fading signal</Badge>;
  if (signal === "new") return <Badge tone="yellow">New signal</Badge>;
  return null;
}

function Action({ date, performer }: { date: TourDate; performer: string }) {
  const cls = "relative z-10 inline-flex min-h-11 shrink-0 items-center rounded-button px-4 text-sm font-extrabold";
  if (date.status === "published" && date.ticket_url) {
    return (
      <a
        href={date.ticket_url}
        target="_blank"
        rel="noopener"
        className={`${cls} bg-spotlight-yellow text-radar-purple hover:bg-white`}
        onClick={() => trackTicketsClick({ id: date.id, title: date.title, performer, city: date.city_name, zone: date.zone })}
      >
        Get tickets
      </a>
    );
  }
  if (date.status === "published") return <span className={`${cls} border-2 border-plum-line text-lavender-text`}>Tickets soon</span>;
  return null;
}

/** Tour dates with country chips (spec 6.2, item 3). Desktop 3 columns; mobile one row per date. */
export function TourDates({ dates, nowIso, performer }: { dates: TourDate[]; nowIso: string; performer: string }) {
  const [country, setCountry] = useState<string | null>(null);
  const now = new Date(nowIso);
  const countries = countryCounts(dates);
  const shown = country ? dates.filter((d) => d.country_code === country) : dates;
  const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm";

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {countries.length > 1 && (
        <div role="group" aria-label="Filter by country" className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:flex-wrap md:px-0">
          <button
            type="button"
            aria-pressed={country === null}
            onClick={() => setCountry(null)}
            className={`${chip} ${country === null ? "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple" : "border-plum-line font-bold hover:border-spotlight-yellow"}`}
          >
            All ({dates.length})
          </button>
          {countries.map((c) => (
            <button
              key={c.code}
              type="button"
              aria-pressed={country === c.code}
              onClick={() => setCountry(c.code)}
              className={`${chip} ${country === c.code ? "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple" : "border-plum-line font-bold hover:border-spotlight-yellow"}`}
            >
              {c.name} ({c.count})
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
        {shown.map((date) => {
          const tile = dateTile(date.starts_at);
          const grey = date.status !== "published";
          return (
            <li key={date.id} className="relative flex items-center gap-3 rounded-2xl bg-radar-plum p-3 md:flex-col md:items-stretch md:gap-3.5 md:rounded-[20px] md:p-[18px]">
              <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-3.5">
                <div
                  className={`flex h-16 w-[60px] shrink-0 flex-col items-center justify-center rounded-xl md:h-[76px] md:w-[72px] md:rounded-[14px] ${
                    grey ? "bg-lavender-text/40 text-radar-purple" : "bg-spotlight-yellow text-radar-purple"
                  }`}
                >
                  <span className="font-display text-[26px] leading-none md:text-[32px]">{tile.day}</span>
                  <span className="text-[11px] font-extrabold tracking-wider md:text-xs">{tile.month}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className={`truncate text-base font-extrabold md:text-lg ${date.status === "cancelled" ? "line-through" : ""}`}>
                    <Link href={`/shows/${date.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-spotlight-yellow">
                      {date.city_name}
                    </Link>
                  </h3>
                  <p className="truncate text-[13px] text-lavender-text md:text-small">
                    {date.country_name}
                    <span className="md:hidden">{date.venue_name ? ` · ${date.venue_name}` : ""}</span>
                  </p>
                  <p className="text-[13px] font-bold md:text-small">{tile.line}</p>
                </div>
              </div>
              {date.venue_name && <p className="hidden truncate text-small text-lavender-text md:block">{date.venue_name}</p>}
              <div className="flex shrink-0 flex-col items-end gap-1.5 md:flex-row md:items-center md:justify-between">
                <span className="hidden md:inline">
                  <DateBadge date={date} now={now} />
                </span>
                <span className="md:hidden">{date.status !== "published" && <DateBadge date={date} now={now} />}</span>
                <Action date={date} performer={performer} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
