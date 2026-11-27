import Link from "next/link";
import type { TourRow } from "@/lib/data/types";
import { formatMonthRange, formatShowDate } from "@/lib/dates";
import { Badge } from "./badge";
import { PosterImage } from "./placeholder-image";

/** Wide tour card for profile pages: poster, name, counts, city chips, next date, "View tour". */
export function TourWideCard({ tour, label }: { tour: TourRow; label: string }) {
  const cities = tour.cities ?? [];
  const shown = cities.slice(0, 3);
  const more = cities.length - shown.length;
  const range = formatMonthRange(new Date(tour.first_show_at), new Date(tour.last_show_at));
  const next = tour.next_show_at ? formatShowDate(new Date(tour.next_show_at)).split(" · ")[0] : null;
  const counts = [
    `${tour.show_count} ${tour.show_count === 1 ? "show" : "shows"}`,
    tour.country_count > 1 ? `${tour.country_count} countries` : null,
    range,
  ].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-[18px] bg-radar-plum md:grid md:grid-cols-[360px_minmax(0,1fr)] md:rounded-[24px]">
      <PosterImage
        src={tour.poster_url}
        fallback={tour.owner_photo_url}
        alt=""
        iconSize={56}
        tone="deep"
        className="h-[150px] w-full md:h-full md:min-h-[220px]"
      />
      <div className="flex flex-col gap-2 p-4 md:px-7 md:py-[26px]">
        <div className="flex gap-1.5">
          <Badge tone={tour.owner_type === "group" ? "yellow" : "pink"}>{label}</Badge>
        </div>
        <h3 className="font-display text-[24px] leading-tight md:text-[32px]">
          <Link href={`/tours/${tour.slug}`} className="hover:text-spotlight-yellow">
            {tour.name}
          </Link>
        </h3>
        <p className="text-small text-lavender-text md:text-[15px]">{counts.join(" · ")}</p>
        {shown.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Cities">
            {shown.map((c) => (
              <li key={c} className="rounded-full border-[1.5px] border-plum-line px-2.5 py-0.5 text-xs font-bold">
                {c}
              </li>
            ))}
            {more > 0 && <li className="rounded-full border-[1.5px] border-plum-line px-2.5 py-0.5 text-xs font-bold">+{more}</li>}
          </ul>
        )}
        {next && (
          <p className="text-small font-bold md:text-[15px]">
            Next: {next}
            {tour.next_city_name ? ` · ${tour.next_city_name}` : ""}
          </p>
        )}
        <Link
          href={`/tours/${tour.slug}`}
          className="mt-1.5 inline-flex min-h-11 items-center self-start rounded-button bg-spotlight-yellow px-5 text-[15px] font-extrabold text-radar-purple hover:bg-white"
        >
          View tour
        </Link>
      </div>
    </article>
  );
}
