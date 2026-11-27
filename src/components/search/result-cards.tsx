import Link from "next/link";
import type { SearchComedian, SearchGroup, SearchVenue } from "@/lib/data/search";
import type { TourRow } from "@/lib/data/types";
import { formatShowDate } from "@/lib/dates";
import { plural } from "@/lib/search";
import { Badge } from "../badge";
import { ChevronRight } from "../icons";
import { CoverImage, PosterImage } from "../placeholder-image";

function groupLine(g: SearchGroup): string {
  const parts = [];
  if (g.member_count > 0) parts.push(plural(g.member_count, "comedian"));
  parts.push(plural(g.upcoming_count, "upcoming show"));
  if (g.tour_count > 0) parts.push(plural(g.tour_count, "tour"));
  return parts.join(" · ");
}

/** Wide group card. `best` adds the yellow border and the bigger layout. */
export function GroupResult({ group, best = false }: { group: SearchGroup; best?: boolean }) {
  return (
    <Link
      href={`/groups/${group.slug}`}
      className={`group flex items-center gap-3.5 rounded-[18px] bg-radar-plum p-3 md:grid md:grid-cols-[220px_minmax(0,1fr)_auto] md:gap-6 md:rounded-[24px] md:p-5 ${
        best ? "border-2 border-spotlight-yellow" : "border-2 border-transparent hover:border-plum-line"
      }`}
    >
      <CoverImage
        src={group.photo_url}
        alt=""
        iconSize={40}
        className="h-[72px] w-[72px] shrink-0 rounded-xl md:h-[140px] md:w-full md:rounded-2xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
        <div className="flex gap-1.5">
          <Badge tone="yellow">Group</Badge>
          {group.tour_count > 0 && <Badge tone="pink">On tour</Badge>}
        </div>
        <span className="truncate font-display text-[22px] leading-tight group-hover:text-spotlight-yellow md:text-[34px]">
          {group.name}
        </span>
        <span className="text-[13px] text-lavender-text md:text-[15px]">{groupLine(group)}</span>
      </div>
      <ChevronRight className="shrink-0 text-spotlight-yellow md:hidden" size={22} />
      <span className="hidden rounded-button bg-spotlight-yellow px-5 py-3 text-[15px] font-extrabold text-radar-purple group-hover:bg-white md:inline-block">
        View group
      </span>
    </Link>
  );
}

/** Round comedian card ("Member of [Group]"). */
export function ComedianResult({ comedian, index }: { comedian: SearchComedian; index: number }) {
  const sub = comedian.group_names.length ? `Member of ${comedian.group_names.join(", ")}` : "Comedian";
  return (
    <Link
      href={`/comedians/${comedian.slug}`}
      className="group flex w-[120px] shrink-0 snap-start flex-col items-center gap-2 rounded-[18px] bg-radar-plum px-2.5 py-4 text-center md:w-auto md:px-3 md:py-[18px]"
    >
      <span
        className={`block h-[72px] w-[72px] overflow-hidden rounded-full border-[3px] md:h-[88px] md:w-[88px] ${
          index % 2 === 0 ? "border-spotlight-yellow" : "border-laugh-pink"
        }`}
      >
        <CoverImage src={comedian.photo_url} alt="" iconSize={36} className="h-full w-full" tone="purple" />
      </span>
      <span className="text-[15px] leading-tight font-extrabold group-hover:text-spotlight-yellow md:text-base">
        {comedian.name}
      </span>
      <span className="text-xs text-lavender-text">{sub}</span>
    </Link>
  );
}

/** A comedian or group as the best match card. */
export function BestComedianResult({ comedian }: { comedian: SearchComedian }) {
  const sub = comedian.group_names.length ? `Member of ${comedian.group_names.join(", ")}` : "Comedian";
  return (
    <Link
      href={`/comedians/${comedian.slug}`}
      className="group flex items-center gap-3.5 rounded-[18px] border-2 border-spotlight-yellow bg-radar-plum p-3 md:gap-6 md:rounded-[24px] md:p-5"
    >
      <span className="block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-[3px] border-laugh-pink md:h-[120px] md:w-[120px]">
        <CoverImage src={comedian.photo_url} alt="" iconSize={44} className="h-full w-full" tone="purple" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
        <div>
          <Badge tone="pink">Comedian</Badge>
        </div>
        <span className="truncate font-display text-[22px] leading-tight group-hover:text-spotlight-yellow md:text-[34px]">
          {comedian.name}
        </span>
        <span className="text-[13px] text-lavender-text md:text-[15px]">{sub}</span>
      </div>
      <ChevronRight className="shrink-0 text-spotlight-yellow md:hidden" size={22} />
      <span className="hidden rounded-button bg-spotlight-yellow px-5 py-3 text-[15px] font-extrabold text-radar-purple group-hover:bg-white md:inline-block">
        View comedian
      </span>
    </Link>
  );
}

/** Wide tour card: "GROUP TOUR · 8 SHOWS", name, next date, "View tour". */
export function TourResult({ tour }: { tour: TourRow }) {
  const next = tour.next_show_at ? formatShowDate(new Date(tour.next_show_at)).split(" · ")[0] : null;
  const details = [
    tour.owner_name,
    plural(tour.show_count, "show"),
    tour.country_count > 1 ? plural(tour.country_count, "country", "countries") : null,
    next ? `Next: ${next}${tour.next_city_name ? ` · ${tour.next_city_name}` : ""}` : null,
  ].filter(Boolean);
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex items-center gap-3.5 rounded-[18px] bg-radar-plum p-3 md:gap-6 md:rounded-card md:p-5"
    >
      <PosterImage
        src={tour.poster_url}
        fallback={tour.owner_photo_url}
        phoneCrop
        alt=""
        iconSize={36}
        className="h-[72px] w-[72px] shrink-0 rounded-xl md:h-[110px] md:w-[180px] md:rounded-2xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-1.5">
        <p className="text-label font-extrabold tracking-widest text-laugh-pink uppercase">
          {tour.owner_type === "group" ? "Group tour" : "Tour"} · {plural(tour.show_count, "show")}
        </p>
        <span className="font-display text-[19px] leading-tight group-hover:text-spotlight-yellow md:text-[28px]">
          {tour.name}
        </span>
        <span className="text-[13px] text-lavender-text md:text-[15px]">{details.join(" · ")}</span>
      </div>
      <ChevronRight className="shrink-0 text-spotlight-yellow md:hidden" size={22} />
      <span className="hidden rounded-button bg-spotlight-yellow px-5 py-3 text-[15px] font-extrabold text-radar-purple group-hover:bg-white md:inline-block">
        View tour
      </span>
    </Link>
  );
}

/** Venue row: opens the venue page with all its shows. */
export function VenueResult({ venue }: { venue: SearchVenue }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group flex flex-col gap-1 rounded-[18px] bg-radar-plum p-4"
    >
      <Badge tone="outline">Venue</Badge>
      <span className="mt-1 text-base font-extrabold group-hover:text-spotlight-yellow">{venue.name}</span>
      {venue.city_name && <span className="text-[13px] text-lavender-text">{venue.city_name}</span>}
    </Link>
  );
}
