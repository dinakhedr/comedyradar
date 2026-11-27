import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/badge";
import { Avatar, LineupCard } from "@/components/lineup-card";
import { NewsletterBand } from "@/components/newsletter-band";
import { PosterImage } from "@/components/placeholder-image";
import { ShareButton } from "@/components/share-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TourCard } from "@/components/tour-card";
import { TourDates } from "@/components/tour/tour-dates";
import { getMoreTours, getTour, type TourDetail } from "@/lib/data/tour";
import { paragraphs } from "@/lib/show-page";
import { SITE_URL } from "@/lib/site";
import { shortDate, splitDates, tourStats, tourZoneLabel } from "@/lib/tour-page";
import { TrackView } from "@/components/page-tracker";

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const h2 = "font-display text-[24px] md:text-[40px]";

export async function generateMetadata({ params }: PageProps<"/tours/[slug]">): Promise<Metadata> {
  const tour = await getTour((await params).slug);
  if (!tour) return { title: "Tour not found" };
  // Spec 12: "[Tour name] — all dates"
  const title = `${tour.name} — all dates`;
  const description =
    tour.description?.slice(0, 160) ?? `${tour.owner.name} on tour: every date, city and ticket link for ${tour.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/tours/${tour.slug}` },
    openGraph: { title, description, images: tour.poster_url ? [tour.poster_url] : undefined },
  };
}

/** Tour page (docs/website-spec.md, section 6.2). */
export default function TourPage({ params }: PageProps<"/tours/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense fallback={<TourSkeleton />}>
          <TourContent params={params} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}

function TourSkeleton() {
  return (
    <div className={`${container} pb-14`} aria-hidden="true">
      <div className="h-[520px] rounded-[22px] bg-radar-plum md:h-[500px] md:rounded-[28px]" />
    </div>
  );
}

function seriesJsonLd(tour: TourDetail) {
  const performer = {
    "@type": tour.owner.kind === "group" ? "PerformingGroup" : "Person",
    name: tour.owner.name,
    url: `${SITE_URL}/${tour.owner.kind === "group" ? "groups" : "comedians"}/${tour.owner.slug}`,
  };
  return {
    "@context": "https://schema.org",
    "@type": "EventSeries",
    name: tour.name,
    url: `${SITE_URL}/tours/${tour.slug}`,
    ...(tour.description ? { description: tour.description } : {}),
    ...(tour.poster_url ? { image: [tour.poster_url] } : {}),
    performer,
    subEvent: tour.dates.map((d) => ({
      "@type": "Event",
      name: d.title,
      startDate: d.starts_at,
      url: `${SITE_URL}/shows/${d.slug}`,
      eventStatus: d.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: d.venue_name ?? d.city_name,
        address: { "@type": "PostalAddress", addressLocality: d.city_name, addressCountry: d.country_code },
      },
      performer,
    })),
  };
}

async function TourContent({ params }: { params: PageProps<"/tours/[slug]">["params"] }) {
  const { slug } = await params;
  const tour = await getTour(slug);
  if (!tour) notFound();

  const now = new Date();
  const { upcoming, past } = splitDates(tour.dates, now);
  const stats = tourStats(tour.dates);
  const zone = tourZoneLabel(upcoming.length ? upcoming : tour.dates);
  const about = paragraphs(tour.description);
  const more = await getMoreTours(tour.id, 3);
  const owner = tour.owner;
  const ownerHref = owner.kind === "group" ? `/groups/${owner.slug}` : `/comedians/${owner.slug}`;
  // The tall poster goes on this page when there is one; otherwise the wide banner.
  const tall = tour.poster_tall_url;

  return (
    <>
      <TrackView kind="tour_view" id={tour.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesJsonLd(tour)).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className={`${container} pt-1 pb-3 text-[13px] text-lavender-text md:pt-2 md:pb-5 md:text-small`}>
        <Link href="/" className="hover:text-white">
          Home
        </Link>{" "}
        <span aria-hidden="true">›</span>{" "}
        <Link href="/tours" className="hover:text-white">
          Tours
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="font-bold text-white">{tour.name}</span>
      </nav>

      {/* Tour header card */}
      <section className={`${container} pb-8 md:pb-14`}>
        <div
          className={`overflow-hidden rounded-[22px] bg-radar-plum md:rounded-[28px] ${tall ? "md:grid md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:items-start" : ""}`}
        >
          {tall ? (
            // A tall tour poster sits beside the details, like on a show page (Dina, 2026-11-27).
            <PosterImage src={tall} alt={`Poster for ${tour.name}`} eager className="aspect-[3/4] w-full" />
          ) : (
            // Wide banner on top, details below (Dina picked option B, 2026-11-27). Shown whole, never cropped.
            <PosterImage
              src={tour.poster_url}
              fallback={owner.photo_url}
              alt={`Poster for ${tour.name}`}
              iconSize={88}
              tone="deep"
              eager
              className="aspect-[1376/768] w-full"
            />
          )}
          <div
            className={`grid gap-5 p-4 md:items-start md:gap-8 md:px-11 md:py-9 ${tall ? "" : "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"}`}
          >
            <div className="flex flex-col gap-3.5 md:gap-4">
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Badge tone={owner.kind === "group" ? "yellow" : "pink"} size="md">
                  {owner.kind === "group" ? "Group tour" : "Comedian tour"}
                </Badge>
                {zone && (
                  <Badge tone="purple" size="md">
                    {zone}
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-[36px] leading-[1.02] md:text-[56px] md:leading-none">{tour.name}</h1>
              <div className="flex items-center gap-3">
                <Avatar person={owner} ring={owner.kind === "group" ? "yellow" : "pink"} size="h-11 w-11 md:h-[52px] md:w-[52px]" />
                <div className="flex min-w-0 flex-col">
                  <Link href={ownerHref} className="text-[17px] font-extrabold text-spotlight-yellow hover:text-white md:text-xl">
                    {owner.name}
                  </Link>
                  <span className="text-[13px] text-lavender-text md:text-small">
                    {owner.kind === "group"
                      ? `Comedy group${owner.members.length ? ` · ${owner.members.length} comedians` : ""}`
                      : "Comedian"}
                  </span>
                </div>
              </div>
              {about.length > 0 && (
                <div className="flex flex-col gap-2 text-[15px] leading-6 text-lavender md:text-base md:leading-[26px]">
                  {about.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3.5 md:gap-4">
              {stats.shows > 0 && (
                <dl className="grid grid-cols-3 gap-2 md:gap-3">
                  {[
                    [String(stats.shows), stats.shows === 1 ? "show" : "shows"],
                    [String(stats.countries), stats.countries === 1 ? "country" : "countries"],
                    [stats.months ?? "", stats.year ?? ""],
                  ].map(([value, label], i) => (
                    <div key={i} className="flex flex-col gap-0.5 rounded-2xl bg-radar-purple px-3 py-3 md:px-4 md:py-3.5">
                      <dt className="sr-only">{i === 2 ? "Dates" : label}</dt>
                      <dd className={`font-display leading-tight text-spotlight-yellow ${i === 2 ? "text-lg md:text-2xl" : "text-[26px] md:text-[32px]"}`}>
                        {value}
                      </dd>
                      <dd className="text-[13px] text-lavender-text md:text-small">{label}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="flex gap-2 md:gap-3">
                <a
                  href="#dates"
                  className="flex min-h-12 flex-1 items-center justify-center rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple hover:bg-white md:flex-none md:px-6"
                >
                  See all dates
                </a>
                <ShareButton
                  title={tour.name}
                  url={`${SITE_URL}/tours/${tour.slug}`}
                  label="Share tour"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-button border-2 border-plum-line hover:border-spotlight-yellow hover:text-spotlight-yellow"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tour dates */}
      <section id="dates" aria-labelledby="dates-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-8 md:gap-5 md:pb-10`}>
        <h2 id="dates-title" className={h2}>
          Tour <span className="text-spotlight-yellow">dates</span>
        </h2>
        {upcoming.length > 0 ? (
          <TourDates dates={upcoming} performer={tour.owner.name} />
        ) : (
          <p className="rounded-card bg-radar-plum p-5 text-base text-lavender-text">
            No upcoming dates right now. New dates will show up here as soon as they are announced.
          </p>
        )}
        {past.length > 0 && (
          <details className="group rounded-2xl bg-radar-plum px-4 py-3 md:px-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-extrabold">
              Past dates ({past.length})
              <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <ul className="flex flex-col gap-1.5 pt-2 pb-1 text-small text-lavender-text">
              {past.map((d) => (
                <li key={d.id}>
                  <Link href={`/shows/${d.slug}`} className="hover:text-white">
                    {shortDate(d.starts_at)} · {d.city_name}, {d.country_name}
                    {d.venue_name ? ` · ${d.venue_name}` : ""}
                    {d.status === "cancelled" ? " · Cancelled" : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* On this tour */}
      <section aria-labelledby="on-tour" className={`${container} flex flex-col gap-3 pb-8 md:gap-5 md:pb-14`}>
        <h2 id="on-tour" className={h2}>
          On this <span className="text-laugh-pink">tour</span>
        </h2>
        {owner.kind === "group" ? (
          <LineupCard group={owner} comedians={owner.members} />
        ) : (
          <Link href={ownerHref} className="group flex items-center gap-4 rounded-[18px] bg-radar-plum p-4 md:rounded-[24px] md:p-6">
            <Avatar person={owner} ring="pink" size="h-[72px] w-[72px] md:h-24 md:w-24" />
            <div className="flex flex-col gap-1">
              <Badge tone="pink">Comedian</Badge>
              <span className="text-lg font-extrabold group-hover:text-spotlight-yellow md:text-xl">{owner.name}</span>
              <span className="text-small font-extrabold text-spotlight-yellow">View comedian page ›</span>
            </div>
          </Link>
        )}
      </section>

      {/* More tours */}
      {more.length > 0 && (
        <section aria-labelledby="more-tours" className="bg-plum-deep">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3.5 py-7 md:gap-[22px] md:px-8 md:py-14">
            <div className="flex items-end justify-between gap-3 px-[18px] md:px-0">
              <h2 id="more-tours" className={h2}>
                More <span className="text-spotlight-yellow">tours</span>
              </h2>
              <Link href="/tours" className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
                All tours
              </Link>
            </div>
            <div className="no-scrollbar flex snap-x scroll-px-[18px] gap-3 overflow-x-auto px-[18px] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
              {more.map((t) => (
                <TourCard key={t.id} tour={t} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
