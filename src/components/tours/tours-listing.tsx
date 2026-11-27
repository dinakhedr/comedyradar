import Link from "next/link";
import { Badge } from "../badge";
import { SearchIcon } from "../icons";
import { PosterImage } from "../placeholder-image";
import { FilterSheet, NavSelect, type NavOption } from "../shows/nav-controls";
import { getToursListing, type TourCountry, type TourListItem } from "@/lib/data/tours";
import { formatMonthRange, formatShowDate } from "@/lib/dates";
import {
  filterTours,
  isVisitingTour,
  parseToursFilters,
  tourCounts,
  toursHref,
  tourSignal,
  TOURS_SORT_OPTIONS,
  TOURS_STEP,
  TOURS_WHEN_OPTIONS,
  WHERE_OPTIONS,
  WHO_OPTIONS,
  type ToursFilters,
} from "@/lib/tours-filters";

type SP = Promise<Record<string, string | string[] | undefined>>;

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm md:px-[18px] md:text-[15px]";
const chipOn = "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple";
const chipOff = "border-plum-line font-bold text-white hover:border-spotlight-yellow";
const rowLabel = "shrink-0 text-[13px] font-extrabold tracking-[1px] text-lavender-text md:w-[100px]";

const SIGNAL_BADGE = {
  strong: { label: "Strong Signal", tone: "pink" },
  fading: { label: "Fading Signal", tone: "pink" },
  new: { label: "New Signal", tone: "yellow" },
} as const;

/** Tour card on /tours (spec 7.2 item 4): photo, badges, performer, tour name, counts, next date, cities, "View tour". */
function TourGridCard({ tour }: { tour: TourListItem }) {
  const shown = tour.cities.slice(0, 3);
  const more = tour.cities.length - shown.length;
  const signal = tourSignal(tour.dates);
  const range = formatMonthRange(new Date(tour.first_show_at), new Date(tour.last_show_at));
  const next = formatShowDate(new Date(tour.next_show_at)).split(" · ")[0];
  const ownerHref = tour.owner_type === "group" ? `/groups/${tour.owner_slug}` : `/comedians/${tour.owner_slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-[18px] bg-radar-plum md:rounded-card">
      <PosterImage
        src={tour.poster_url}
        fallback={tour.owner_photo_url}
        alt=""
        tone="deep"
        iconSize={48}
        className="aspect-[1376/768] w-full"
      />
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4 md:gap-2 md:px-5 md:pt-[18px] md:pb-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={tour.owner_type === "group" ? "yellow" : "pink"}>
            {tour.owner_type === "group" ? "Group" : "Comedian"}
          </Badge>
          {signal && <Badge tone={SIGNAL_BADGE[signal].tone}>{SIGNAL_BADGE[signal].label}</Badge>}
          {isVisitingTour(tour.dates) && <Badge tone="purple">Visiting Egypt</Badge>}
        </div>
        <h2 className="font-display text-[22px] leading-tight md:text-[26px]">
          <Link href={ownerHref} className="hover:text-spotlight-yellow">
            {tour.owner_name}
          </Link>
        </h2>
        <p className="text-sm font-bold text-spotlight-yellow md:text-[15px]">
          <Link href={`/tours/${tour.slug}`} className="hover:underline">
            {tour.name}
          </Link>
        </p>
        <p className="text-[13px] text-lavender-text md:text-small">
          {tourCounts(tour.show_count, tour.country_count, tour.countries[0] ?? null, range)}
        </p>
        <p className="text-[13px] font-bold md:text-small">
          Next: {next}
          {tour.next_city_name ? ` · ${tour.next_city_name}` : ""}
        </p>
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
        <Link
          href={`/tours/${tour.slug}`}
          className="mt-auto flex min-h-11 items-center justify-center rounded-button bg-spotlight-yellow px-5 text-sm font-extrabold text-radar-purple hover:bg-white md:mt-2 md:self-start md:text-[15px]"
        >
          View tour
        </Link>
      </div>
    </article>
  );
}

type Ctx = { f: ToursFilters; countries: TourCountry[] };

function ChipLinks<T extends string>({
  options,
  current,
  make,
}: {
  options: { value: T; label: string }[];
  current: T;
  make: (v: T) => string;
}) {
  return options.map((o) => (
    <Link
      key={o.value}
      href={make(o.value)}
      scroll={false}
      aria-current={current === o.value ? "true" : undefined}
      className={`${chip} ${current === o.value ? chipOn : chipOff}`}
    >
      {o.label}
    </Link>
  ));
}

function CountrySelect({ c, id }: { c: Ctx; id: string }) {
  const options: NavOption[] = [
    { value: "", label: "Country: All", href: toursHref(c.f, { country: null }) },
    ...c.countries.map((x) => ({ value: x.code, label: `Country: ${x.name}`, href: toursHref(c.f, { country: x.code }) })),
  ];
  if (c.f.country && !options.some((o) => o.value === c.f.country)) {
    options.push({ value: c.f.country, label: `Country: ${c.f.country}`, href: toursHref(c.f) });
  }
  return <NavSelect id={id} label="Country" value={c.f.country ?? ""} options={options} className="md:w-auto" />;
}

function SortSelect({ c, id, mobile }: { c: Ctx; id: string; mobile?: boolean }) {
  return (
    <NavSelect
      id={id}
      label={mobile ? "Sort" : "Sort by"}
      srOnlyLabel={mobile}
      value={c.f.sort}
      options={TOURS_SORT_OPTIONS.map((s) => ({
        value: s.value,
        label: mobile ? `Sort: ${s.short}` : s.label,
        href: toursHref(c.f, { sort: s.value }),
      }))}
      className={mobile ? "flex-1" : ""}
      selectClassName={mobile ? "bg-radar-plum text-sm text-center" : "bg-radar-plum"}
    />
  );
}

function SearchForm({ f }: { f: ToursFilters }) {
  const keep = new URLSearchParams(toursHref(f, { q: "" }).split("?")[1] ?? "");
  return (
    <form action="/tours" role="search" className="flex w-full gap-1.5 rounded-[14px] bg-white p-[5px] md:gap-2 md:rounded-2xl md:p-1.5">
      {[...keep.entries()].map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="tours-q" className="sr-only">
        Search tours
      </label>
      <input
        id="tours-q"
        name="q"
        type="search"
        defaultValue={f.q}
        placeholder="Search a tour, comedian, group or city"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-[10px] px-3 py-3 text-base font-bold text-radar-purple placeholder:font-normal placeholder:text-radar-purple/60 md:px-4 md:py-3.5 md:text-[17px]"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-radar-purple text-spotlight-yellow hover:bg-radar-plum md:h-auto md:w-auto md:rounded-button md:px-7 md:py-3.5 md:text-base md:font-extrabold"
      >
        <SearchIcon className="md:hidden" />
        <span className="hidden md:inline">Search</span>
      </button>
    </form>
  );
}

/** All tours (docs/website-spec.md, 7.2). */
export async function ToursListing({ searchParams }: { searchParams: SP }) {
  const f = parseToursFilters(await searchParams);
  const { tours, countries } = await getToursListing();
  const now = new Date();
  const matches = filterTours(tours, f, now);
  const visible = matches.slice(0, f.show);
  const performers = new Set(tours.map((t) => `${t.owner_type}:${t.owner_slug}`)).size;
  const c: Ctx = { f, countries };
  const isFiltered = toursHref(f) !== "/tours";
  const sheetCount = [!!f.country, f.when !== "any"].filter(Boolean).length;

  return (
    <>
      <section className={`${container} flex flex-col gap-3 pb-[18px] md:gap-4 md:pb-7`}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
            ALL <span className="text-laugh-pink">TOURS</span>
          </h1>
          <p className="text-sm text-lavender-text md:text-[17px]">
            {performers} {performers === 1 ? "comedian or group" : "comedians and groups"} on tour
          </p>
        </div>
        <SearchForm f={f} />
      </section>

      {/* Desktop filter panel */}
      <section aria-label="Filters" className={`${container} hidden pb-6 md:block`}>
        <div className="flex flex-col gap-4 rounded-[20px] bg-radar-plum px-[22px] py-5">
          <div role="group" aria-label="Performer" className="flex flex-wrap items-center gap-2.5">
            <span className={rowLabel}>PERFORMER</span>
            <ChipLinks options={WHO_OPTIONS} current={f.who} make={(who) => toursHref(f, { who })} />
          </div>
          <div role="group" aria-label="Where" className="flex flex-wrap items-center gap-2.5">
            <span className={rowLabel}>WHERE</span>
            <ChipLinks options={WHERE_OPTIONS} current={f.where} make={(where) => toursHref(f, { where })} />
            <CountrySelect c={c} id="d-country" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div role="group" aria-label="When" className="flex flex-wrap items-center gap-2.5">
              <span className={rowLabel}>WHEN</span>
              <ChipLinks options={TOURS_WHEN_OPTIONS} current={f.when} make={(when) => toursHref(f, { when })} />
            </div>
            {isFiltered && (
              <Link href="/tours" scroll={false} className="min-h-11 px-1 py-2.5 text-[15px] font-extrabold text-spotlight-yellow underline hover:text-white">
                Clear all
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filters */}
      <section aria-label="Filters" className="flex flex-col gap-2.5 pb-4 md:hidden">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px]">
          <ChipLinks options={WHO_OPTIONS} current={f.who} make={(who) => toursHref(f, { who })} />
          <ChipLinks
            options={WHERE_OPTIONS.filter((o) => o.value !== "all")}
            current={f.where}
            make={(where) => toursHref(f, { where: f.where === where ? "all" : where })}
          />
        </div>
        <div className="flex gap-2 px-[18px]">
          <FilterSheet count={sheetCount}>
            <div role="group" aria-label="Where" className="flex flex-col gap-2.5">
              <span className={rowLabel}>WHERE</span>
              <div className="flex flex-wrap gap-2">
                <ChipLinks options={WHERE_OPTIONS} current={f.where} make={(where) => toursHref(f, { where })} />
              </div>
              <CountrySelect c={c} id="m-country" />
            </div>
            <div role="group" aria-label="When" className="flex flex-col gap-2.5">
              <span className={rowLabel}>WHEN</span>
              <div className="flex flex-wrap gap-2">
                <ChipLinks options={TOURS_WHEN_OPTIONS} current={f.when} make={(when) => toursHref(f, { when })} />
              </div>
            </div>
            {isFiltered && (
              <Link href="/tours" scroll={false} className="self-start py-2 text-[15px] font-extrabold text-spotlight-yellow underline">
                Clear all
              </Link>
            )}
          </FilterSheet>
          <SortSelect c={c} id="m-sort" mobile />
        </div>
      </section>

      <section aria-label="Tours" className={`${container} flex flex-col gap-3.5 pb-10 md:gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-lavender-text md:text-[15px]" aria-live="polite">
            {matches.length === 0
              ? "Showing 0 tours"
              : `Showing 1–${visible.length} of ${matches.length} ${matches.length === 1 ? "tour" : "tours"}`}
          </p>
          <div className="hidden md:block">
            <SortSelect c={c} id="d-sort" />
          </div>
        </div>
        {visible.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-card bg-radar-plum p-6 md:p-10">
            <p className="font-display text-[22px] md:text-display-md">
              {isFiltered ? "Nothing on the radar for these filters" : "No tours on the radar yet"}
            </p>
            {isFiltered && (
              <Link
                href="/tours"
                className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 py-3 font-extrabold text-radar-purple hover:bg-white"
              >
                Clear all
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
            {visible.map((t) => (
              <TourGridCard key={t.id} tour={t} />
            ))}
          </div>
        )}
        {matches.length > visible.length && (
          <div className="flex justify-center pt-1">
            <Link
              href={toursHref(f, { show: f.show + TOURS_STEP })}
              scroll={false}
              className="flex min-h-12 w-full items-center justify-center rounded-button border-2 border-spotlight-yellow px-8 text-[15px] font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple md:w-auto md:text-base"
            >
              Load more tours
            </Link>
          </div>
        )}
      </section>

      <section className={`${container} pb-8 md:pb-14`}>
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-plum-deep p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-card md:px-9 md:py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-[22px] md:text-[32px]">PLANNING A TOUR?</h2>
            <p className="text-sm text-lavender-text md:text-base">
              Comedians, groups and promoters can add every date in one go.
            </p>
          </div>
          <Link
            href="/dashboard/tours/new"
            className="flex min-h-12 shrink-0 items-center justify-center rounded-button bg-spotlight-yellow px-7 text-[15px] font-extrabold text-radar-purple hover:bg-white md:text-base"
          >
            Add your tour
          </Link>
        </div>
      </section>
    </>
  );
}

export function ToursListingSkeleton() {
  return (
    <div className={`${container} flex flex-col gap-4 pb-10`} aria-busy="true" aria-label="Loading tours">
      <div className="h-12 w-64 rounded-lg bg-radar-plum md:h-14" />
      <div className="h-14 rounded-2xl bg-white/90" />
      <div className="hidden h-[200px] rounded-[20px] bg-radar-plum md:block" />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[380px] animate-pulse rounded-[18px] bg-radar-plum md:rounded-card" />
        ))}
      </div>
    </div>
  );
}
