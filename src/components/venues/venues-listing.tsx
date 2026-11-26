import Link from "next/link";
import { VenueLogo, venuePlace } from "../venue-logo";
import { getVenuesListing } from "@/lib/data/venues";
import { cityChips, filterVenues, type VenueListItem } from "@/lib/venues-list";

type SP = Promise<Record<string, string | string[] | undefined>>;

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm md:px-[18px] md:text-[15px]";
const chipOn = "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple";
const chipOff = "border-plum-line font-bold text-white hover:border-spotlight-yellow";

function VenueCard({ v }: { v: VenueListItem }) {
  return (
    <article className="relative flex flex-col gap-2.5 rounded-[18px] bg-radar-plum p-3.5 md:rounded-card md:p-4">
      <VenueLogo src={v.logo_url} name={v.name} pinSize={48} className="w-full rounded-[14px]!" />
      <h2 className="text-[17px] leading-snug font-extrabold md:text-[19px]">
        <Link href={`/venues/${v.slug}`} className="after:absolute after:inset-0 hover:text-spotlight-yellow">
          {v.name}
        </Link>
      </h2>
      <p className="text-[13px] text-lavender-text md:text-sm">
        {venuePlace(v.area, v.city.name)}, {v.country_name}
      </p>
      <p className={`text-[13px] md:text-sm ${v.upcoming ? "font-extrabold text-spotlight-yellow" : "text-lavender-text"}`}>
        {v.upcoming === 0 ? "No shows right now" : v.upcoming === 1 ? "1 show coming up" : `${v.upcoming} shows coming up`}
      </p>
    </article>
  );
}

/** Title, city chips and the venue cards. */
export async function VenuesListing({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const city = typeof sp.city === "string" ? sp.city : "";
  const all = await getVenuesListing();
  const chips = cityChips(all);
  const list = filterVenues(all, city);
  const active = chips.some((c) => c.slug === city) ? city : "";
  return (
    <section aria-labelledby="venues-title" className={`${container} flex flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
      <div className="flex flex-col gap-2">
        <h1 id="venues-title" className="font-display text-[44px] leading-none md:text-[64px]">
          Venues
        </h1>
        <p className="text-base text-lavender-text md:text-lg">Where stand-up happens. Pick a venue to see its shows.</p>
      </div>
      {chips.length > 1 && (
        <nav aria-label="Cities" className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:flex-wrap md:px-0">
          <Link href="/venues" scroll={false} aria-current={active ? undefined : "page"} className={`${chip} ${active ? chipOff : chipOn}`}>
            All cities ({all.length})
          </Link>
          {chips.map((c) => (
            <Link
              key={c.slug}
              href={`/venues?city=${c.slug}`}
              scroll={false}
              aria-current={active === c.slug ? "page" : undefined}
              className={`${chip} ${active === c.slug ? chipOn : chipOff}`}
            >
              {c.name} ({c.count})
            </Link>
          ))}
        </nav>
      )}
      {list.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {list.map((v) => (
            <VenueCard key={v.id} v={v} />
          ))}
        </div>
      ) : (
        <p className="rounded-card bg-radar-plum p-5 text-base text-lavender-text md:p-6 md:text-lg">
          <span className="font-extrabold text-white">No venues on the radar yet.</span> They will appear here as soon as they are added.
        </p>
      )}
    </section>
  );
}

export function VenuesListingSkeleton() {
  return (
    <div className={`${container} grid grid-cols-2 gap-3 pb-14 md:grid-cols-4 md:gap-5`} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] rounded-card bg-radar-plum" />
      ))}
    </div>
  );
}
