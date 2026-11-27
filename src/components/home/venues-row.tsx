import Link from "next/link";
import { getVenuesListing } from "@/lib/data/venues";
import { PinIcon } from "../icons";
import { venuePlace } from "../venue-logo";

const SHOWN = 6;

/** Homepage venues (after Comedians to track): the 6 venues with the most upcoming shows, square logos in a yellow frame. */
export async function VenuesRow() {
  const venues = (await getVenuesListing()).slice(0, SHOWN);
  if (venues.length === 0) return null;

  return (
    <section
      aria-labelledby="home-venues-title"
      className="mx-auto flex max-w-[1280px] flex-col gap-5 px-[18px] py-8 md:gap-6 md:px-8 md:pt-6 md:pb-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="home-venues-title" className="font-display text-[28px] md:text-[40px]">
          Venues
        </h2>
        <Link href="/venues" className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
          All venues
        </Link>
      </div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-6 md:grid-cols-6 md:gap-6">
        {venues.map((v) => (
          <li key={v.id}>
            <Link href={`/venues/${v.slug}`} className="group flex flex-col items-center gap-2 text-center">
              <span className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-[18px] border-[3px] border-spotlight-yellow bg-radar-purple text-lavender-text md:h-28 md:w-28">
                {v.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logos come from Supabase Storage
                  <img src={v.logo_url} alt="" loading="lazy" className="h-full w-full bg-white object-cover" />
                ) : (
                  <PinIcon size={40} />
                )}
              </span>
              <span className="mt-1 text-[15px] leading-snug font-extrabold group-hover:text-spotlight-yellow md:text-base">{v.name}</span>
              <span className="text-[13px] text-lavender-text">{venuePlace(v.area, v.city.name)}</span>
              <span className="text-[13px] text-lavender-text">
                {v.upcoming === 0 ? "No shows right now" : `${v.upcoming} upcoming ${v.upcoming === 1 ? "show" : "shows"}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
