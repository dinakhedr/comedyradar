import Link from "next/link";
import type { TourRow } from "@/lib/data/types";
import { formatMonthRange } from "@/lib/dates";
import { Badge } from "./badge";
import { PosterImage } from "./placeholder-image";

/** One card per tour (not per show), with "View tour". No prices. */
export function TourCard({ tour }: { tour: TourRow }) {
  const cities = tour.cities ?? [];
  const shown = cities.slice(0, 3);
  const more = cities.length - shown.length;
  const range = formatMonthRange(new Date(tour.first_show_at), new Date(tour.last_show_at));

  return (
    <article className="flex w-[260px] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] bg-radar-plum md:w-auto md:rounded-card">
      <PosterImage
        src={tour.poster_url}
        fallback={tour.owner_photo_url}
        alt=""
        tone="purple"
        iconSize={48}
        className="aspect-[1376/768] w-full"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3.5 md:gap-2 md:px-5 md:pt-[18px] md:pb-5">
        <div>
          <Badge tone={tour.owner_type === "group" ? "yellow" : "pink"}>
            {tour.owner_type === "group" ? "Group" : "Comedian"}
          </Badge>
        </div>
        <h3 className="font-display text-[21px] leading-tight md:text-[26px]">
          <Link
            href={tour.owner_type === "group" ? `/groups/${tour.owner_slug}` : `/comedians/${tour.owner_slug}`}
            className="hover:text-spotlight-yellow"
          >
            {tour.owner_name}
          </Link>
        </h3>
        <p className="text-small font-bold text-spotlight-yellow md:text-[15px]">{tour.name}</p>
        <p className="text-[13px] text-lavender-text md:text-small">
          {tour.show_count} {tour.show_count === 1 ? "show" : "shows"} · {range}
        </p>
        {shown.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Cities">
            {shown.map((c) => (
              <li key={c} className="rounded-full border-[1.5px] border-plum-line px-2.5 py-0.5 text-xs font-bold">
                {c}
              </li>
            ))}
            {more > 0 && (
              <li className="rounded-full border-[1.5px] border-plum-line px-2.5 py-0.5 text-xs font-bold">+{more}</li>
            )}
          </ul>
        )}
        <Link
          href={`/tours/${tour.slug}`}
          className="mt-2 inline-flex min-h-11 items-center self-start rounded-button bg-spotlight-yellow px-4 py-2.5 text-sm font-extrabold text-radar-purple hover:bg-white"
        >
          View tour
        </Link>
      </div>
    </article>
  );
}
