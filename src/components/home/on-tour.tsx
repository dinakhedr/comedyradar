import Link from "next/link";
import { getActiveTours, getHomeSettings } from "@/lib/data/home";
import { TourCard } from "../tour-card";

/** On tour (spec 5.5): one card per tour; hidden when no tour is active. */
export async function OnTour() {
  const settings = await getHomeSettings();
  const tours = await getActiveTours(settings.toursCount);
  if (tours.length === 0) return null;
  return (
    <section aria-labelledby="on-tour-title" className="bg-plum-deep">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3.5 py-7 md:gap-[22px] md:px-8 md:py-14">
        <div className="flex items-end justify-between gap-3 px-[18px] md:px-0">
          <div className="flex flex-col gap-1.5">
            <h2 id="on-tour-title" className="font-display text-[28px] md:text-[40px]">
              On <span className="text-laugh-pink">tour</span>
            </h2>
            <p className="hidden text-base text-lavender-text md:block">
              Comedians and comedy groups on tour. Open a tour to see every date.
            </p>
          </div>
          <Link href="/tours" className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
            All tours
          </Link>
        </div>
        <div className="no-scrollbar flex snap-x scroll-px-[18px] gap-3 overflow-x-auto px-[18px] md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
          {tours.map((t) => (
            <TourCard key={t.id} tour={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
