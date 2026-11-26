import Link from "next/link";
import { getComingUp, getHomeSettings } from "@/lib/data/home";
import { ShowCard } from "../show-card";
import { homeFilters } from "./params";

type SP = Promise<Record<string, string | string[] | undefined>>;

function SectionHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h2 id="coming-up-title" className="font-display text-[28px] md:text-[40px]">
        Coming up
      </h2>
      <Link href="/shows" className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
        <span className="md:hidden">See all</span>
        <span className="hidden md:inline">See all shows</span>
      </Link>
    </div>
  );
}

const wrapper = "mx-auto flex max-w-[1280px] scroll-mt-4 flex-col gap-3 px-[18px] pb-8 md:gap-6 md:px-8 md:pb-16";

/** Coming up (spec 5.4): the next 8 published shows for the hero filters. */
export async function ComingUp({ searchParams }: { searchParams: SP }) {
  const [{ when, city, country }, settings] = await Promise.all([homeFilters(searchParams), getHomeSettings()]);
  const shows = await getComingUp(when, city, settings.comingUpCount, country);
  const now = new Date();

  return (
    <section id="coming-up" aria-labelledby="coming-up-title" className={wrapper}>
      <SectionHeader />
      {shows.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-card bg-radar-plum p-6 md:p-10">
          <p className="font-display text-[22px] md:text-display-md">Nothing on the radar for this filter yet</p>
          <Link
            href="/#coming-up"
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 py-3 font-extrabold text-radar-purple hover:bg-white"
          >
            Show all upcoming
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
          {shows.map((s) => (
            <ShowCard key={s.id} show={s} now={now} />
          ))}
        </div>
      )}
      <div>
        <Link
          href="/shows"
          className="flex min-h-12 items-center justify-center rounded-button border-2 border-spotlight-yellow px-6 text-[15px] font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple md:inline-flex md:text-base"
        >
          See all upcoming shows
        </Link>
      </div>
    </section>
  );
}

export function ComingUpSkeleton() {
  return (
    <section aria-labelledby="coming-up-title" className={wrapper} aria-busy="true">
      <SectionHeader />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-radar-plum md:h-[340px] md:rounded-card" />
        ))}
      </div>
    </section>
  );
}
