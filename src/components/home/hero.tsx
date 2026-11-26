import { Suspense } from "react";
import { getCities } from "@/lib/data/home";
import { SearchIcon } from "../icons";
import { FilterChips, FilterChipsSkeleton } from "./filter-chips";

/** Hero: "On the radar this month", full-width search and filter chips (spec 5.2). */
export async function Hero({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cities = await getCities();
  return (
    <section className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-[18px] pt-3 pb-6 md:gap-5 md:px-8 md:pt-6 md:pb-10">
      <h1 className="font-display text-[40px] leading-none md:text-display-xl">
        On the radar <span className="text-spotlight-yellow">this month</span>
      </h1>
      <p className="hidden text-lg leading-7 text-lavender-text md:block">
        Every stand-up show in Egypt and our comedians on tour, in one place.
      </p>
      <form
        action="/search"
        role="search"
        className="flex w-full gap-1.5 rounded-[14px] bg-white p-[5px] md:gap-2 md:rounded-2xl md:p-1.5"
      >
        <label htmlFor="hero-search" className="sr-only">
          Search shows, comedians, groups or venues
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder="Search a comedian, group, show or venue"
          className="min-w-0 flex-1 rounded-[10px] px-3 py-3 text-base text-radar-purple placeholder:text-radar-purple/60 md:px-4 md:py-3.5 md:text-[17px]"
        />
        <button
          type="submit"
          aria-label="Scan the radar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-radar-purple text-spotlight-yellow hover:bg-radar-plum md:h-auto md:w-auto md:rounded-button md:px-7 md:py-3.5 md:text-base md:font-extrabold"
        >
          <SearchIcon className="md:hidden" />
          <span className="hidden md:inline">Scan the radar</span>
        </button>
      </form>
      <Suspense fallback={<FilterChipsSkeleton />}>
        <FilterChips searchParams={searchParams} cities={cities} />
      </Suspense>
    </section>
  );
}
