import Link from "next/link";
import { getHomeSettings, getSpotlight } from "@/lib/data/home";
import { PlaceholderImage } from "../placeholder-image";
import { SpotlightCarousel } from "./spotlight-carousel";

export async function SpotlightSection() {
  const settings = await getHomeSettings();
  const slides = await getSpotlight(settings.spotlightSlides);

  if (slides.length === 0) return <SpotlightEmpty />;

  return (
    <SpotlightCarousel
      autoAdvanceSeconds={settings.spotlightAutoadvanceSeconds}
      slides={slides.map((s) => ({
        show: s.show,
        sponsored: s.source === "placement" && Boolean((s.show as { is_paid?: boolean }).is_paid),
      }))}
    />
  );
}

/** The carousel is never empty: before any show is listed, it invites comedians. */
function SpotlightEmpty() {
  return (
    <section
      aria-labelledby="spotlight-title"
      className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-[18px] pb-7 md:gap-5 md:px-8 md:pb-14"
    >
      <div className="flex items-baseline gap-2.5 md:gap-3.5">
        <h2 id="spotlight-title" className="font-display text-[28px] md:text-[40px]">
          Spotlight
        </h2>
        <span className="text-small text-lavender-text md:text-base">This month</span>
      </div>
      <article className="overflow-hidden rounded-[22px] bg-radar-plum md:grid md:min-h-[420px] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:rounded-spotlight">
        <PlaceholderImage className="h-[230px] w-full md:h-full" iconSize={96} />
        <div className="flex flex-col justify-center gap-2 p-[18px] md:gap-3.5 md:px-11 md:py-10">
          <h3 className="font-display text-[28px] leading-[1.05] md:text-display-lg">
            The radar is <span className="text-spotlight-yellow">warming up</span>
          </h3>
          <p className="text-base text-lavender-text md:text-[17px] md:leading-relaxed">
            The first shows are landing soon. Are you a comedian or a manager? List your shows for free.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3 md:mt-2.5">
            <Link
              href="/for-comedians"
              className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-6 py-3.5 text-[17px] font-extrabold text-radar-purple hover:bg-white"
            >
              List your shows
            </Link>
            <a
              href="https://instagram.com/comedyradar"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center rounded-button border-2 border-plum-line px-5 py-3 font-bold hover:border-spotlight-yellow"
            >
              Follow @comedyradar
            </a>
          </div>
        </div>
      </article>
    </section>
  );
}
