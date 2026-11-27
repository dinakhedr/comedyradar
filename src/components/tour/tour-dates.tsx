"use client";

import Link from "next/link";
import { useState } from "react";
import { trackTicketsClick } from "@/lib/analytics";
import type { TourDate } from "@/lib/data/tour";
import { countryCounts, dateTile } from "@/lib/tour-page";
import { Badge } from "../badge";
import { InfoIcon } from "../icons";

/** Only cancelled and sold out are shown on a tour date: no signal pill here (Dina, 2026-11-27). */
function DateBadge({ date }: { date: TourDate }) {
  if (date.status === "cancelled") return <Badge tone="pink">Cancelled</Badge>;
  if (date.status === "sold_out") return <Badge tone="outline">Sold out</Badge>;
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
        data-ticket-show={date.id}
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

/** Tour dates with country chips (spec 6.2, item 3): one compact row per date (Dina, 2026-11-27). */
export function TourDates({ dates, performer }: { dates: TourDate[]; performer: string }) {
  const [country, setCountry] = useState<string | null>(null);
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

      <ul className="flex flex-col gap-2.5">
        {shown.map((date) => {
          const tile = dateTile(date.starts_at);
          const grey = date.status !== "published";
          return (
            <li key={date.id} className="relative flex items-center gap-3 rounded-2xl bg-radar-plum p-3 md:gap-5 md:rounded-[18px] md:px-4">
              <div
                className={`flex h-[60px] w-[56px] shrink-0 flex-col items-center justify-center rounded-xl md:h-[60px] md:w-[60px] ${
                  grey ? "bg-lavender-text/40 text-radar-purple" : "bg-spotlight-yellow text-radar-purple"
                }`}
              >
                <span className="font-display text-[24px] leading-none md:text-[26px]">{tile.day}</span>
                <span className="text-[11px] font-extrabold tracking-wider">{tile.month}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-5">
                <div className="min-w-0 md:w-56 md:shrink-0">
                  <h3 className={`truncate text-base font-extrabold md:text-lg ${date.status === "cancelled" ? "line-through" : ""}`}>
                    <Link href={`/shows/${date.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-spotlight-yellow">
                      {date.city_name}
                    </Link>
                    <span className="text-[13px] font-bold text-lavender-text md:hidden"> · {tile.line}</span>
                  </h3>
                  <p className="hidden truncate text-small text-lavender-text md:block">{date.country_name}</p>
                </div>
                <p className="truncate text-[13px] text-lavender-text md:flex-1 md:text-[15px]">
                  <span className="hidden font-bold text-white md:inline">{tile.line}</span>
                  {date.venue_name ? <span><span className="hidden md:inline"> · </span>{date.venue_name}</span> : <span className="md:hidden">{date.country_name}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 md:gap-5">
                {date.status !== "published" && <DateBadge date={date} />}
                <Link
                  href={`/shows/${date.slug}`}
                  aria-label={`More details about ${date.city_name}, ${tile.line}`}
                  className="relative z-10 hidden min-h-11 items-center gap-1.5 text-sm font-extrabold underline decoration-white/45 underline-offset-[3px] hover:decoration-white md:inline-flex"
                >
                  <InfoIcon size={18} />
                  More details
                </Link>
                <Action date={date} performer={performer} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
