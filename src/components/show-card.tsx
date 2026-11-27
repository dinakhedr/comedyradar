import Link from "next/link";
import type { ShowRow } from "@/lib/data/types";
import { formatShowDateLine } from "@/lib/dates";
import { cardBadge, performerHref, showHref, type BadgeInfo } from "@/lib/show-display";
import { Badge } from "./badge";
import { InfoIcon } from "./icons";
import { CoverImage } from "./placeholder-image";
import { TicketButton } from "./ticket-button";

/** Coming up card: a grid card on desktop, a compact row on mobile. No prices. */
export function ShowCard({ show, now, badge: override }: { show: ShowRow; now: Date; badge?: BadgeInfo | null }) {
  const badge = override !== undefined ? override : cardBadge(show);
  const dateLine = formatShowDateLine(new Date(show.starts_at), now);
  const performer = performerHref(show);
  const place = [show.venue_name, show.city_name].filter(Boolean).join(", ");

  return (
    <article className="relative flex items-center gap-3 rounded-2xl bg-radar-plum p-3 md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:rounded-card md:p-0">
      <CoverImage
        src={show.poster_url}
        alt=""
        iconSize={40}
        className="h-[72px] w-[72px] shrink-0 rounded-xl md:h-40 md:w-full md:rounded-none"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1.5 md:px-[18px] md:pt-4 md:pb-[18px]">
        {badge && (
          <div className="hidden md:block">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
        )}
        <p
          className={`text-xs font-extrabold tracking-wide md:text-label ${
            show.status === "sold_out" ? "text-lavender-text md:text-spotlight-yellow" : "text-spotlight-yellow"
          }`}
        >
          {dateLine}
          <span className="md:hidden">{show.status === "sold_out" ? " · SOLD OUT" : ""}</span>
        </p>
        <h3 className="truncate text-base font-extrabold md:whitespace-normal md:text-[19px] md:leading-snug">
          <Link href={showHref(show)} className="hover:underline">
            {show.title}
          </Link>
        </h3>
        <p className="truncate text-[13px] text-lavender-text md:text-[15px] md:font-bold md:text-white">
          {show.headliner_name &&
            (performer ? (
              <Link href={performer} className="hover:underline">
                {show.headliner_name}
              </Link>
            ) : (
              show.headliner_name
            ))}
          <span className="md:hidden">
            {show.headliner_name ? " · " : ""}
            {show.city_name}
          </span>
        </p>
        <p className="hidden text-small text-lavender-text md:block">{place}</p>
        <Link
          href={showHref(show)}
          aria-label={`More details about ${show.title}`}
          className="mt-0.5 inline-flex min-h-8 items-center gap-1.5 self-start text-[13px] font-extrabold text-white underline decoration-white/45 underline-offset-[3px] hover:decoration-white md:hidden"
        >
          <InfoIcon size={16} />
          More details
        </Link>
        <div className="hidden items-center gap-4 pt-2 md:mt-auto md:flex md:flex-wrap">
          <TicketButton show={show} />
          <Link
            href={showHref(show)}
            aria-label={`More details about ${show.title}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold text-white underline decoration-white/45 underline-offset-[3px] hover:decoration-white"
          >
            <InfoIcon size={18} />
            More details
          </Link>
        </div>
      </div>
      <div className="shrink-0 md:hidden">
        <TicketButton show={show} shortLabels />
      </div>
    </article>
  );
}
