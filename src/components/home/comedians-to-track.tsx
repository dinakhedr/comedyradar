import Link from "next/link";
import { getHomeSettings, getTrackItems } from "@/lib/data/home";
import type { TrackItem } from "@/lib/data/types";
import { CoverImage } from "../placeholder-image";

function subline(item: TrackItem): string {
  if (item.on_tour) return "On tour";
  if (item.upcoming_count > 0) return `${item.upcoming_count} upcoming ${item.upcoming_count === 1 ? "show" : "shows"}`;
  if (item.kind === "group" && item.member_count > 0) return `${item.member_count} comedians`;
  return "New on the radar";
}

/** Comedians to track (spec 5.6): a mixed row of comedians and groups. */
export async function ComediansToTrack() {
  const settings = await getHomeSettings();
  const items = await getTrackItems(settings.trackCount);
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="track-title"
      className="mx-auto flex max-w-[1280px] flex-col gap-5 px-[18px] py-8 md:gap-6 md:px-8 md:pt-14 md:pb-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="track-title" className="font-display text-[28px] md:text-[40px]">
          Comedians to track
        </h2>
        <div className="flex gap-5">
          <Link href="/comedians" className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
            All comedians
          </Link>
          <Link href="/groups" className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
            All groups
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-6 md:grid-cols-6 md:gap-6">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              href={item.kind === "group" ? `/groups/${item.slug}` : `/comedians/${item.slug}`}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span className="relative block">
                <span
                  className={`block h-[92px] w-[92px] overflow-hidden rounded-full border-[3px] md:h-28 md:w-28 ${
                    item.kind === "group" ? "border-spotlight-yellow" : "border-laugh-pink"
                  }`}
                >
                  <CoverImage src={item.photo_url} alt="" iconSize={44} className="h-full w-full" tone="deep" />
                </span>
                {item.kind === "group" && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-md bg-spotlight-yellow px-2 py-[3px] text-[11px] font-extrabold tracking-wider text-radar-purple">
                    GROUP
                  </span>
                )}
              </span>
              <span className="mt-1 text-[15px] font-extrabold group-hover:text-spotlight-yellow md:text-base">
                {item.name}
              </span>
              <span className="text-[13px] text-lavender-text">{subline(item)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
