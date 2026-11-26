import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/badge";
import { Avatar, LineupCard } from "@/components/lineup-card";
import { NewsletterBand } from "@/components/newsletter-band";
import { CoverImage } from "@/components/placeholder-image";
import { ShowCard } from "@/components/show-card";
import { ShowActions } from "@/components/show/show-actions";
import { StickyTicketBar } from "@/components/show/sticky-ticket-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { ticketsClickEvent } from "@/lib/analytics-events";
import { formatShowDate } from "@/lib/dates";
import { getRelatedShows, getShow, type Person, type ShowDetail } from "@/lib/data/show";
import type { ShowRow } from "@/lib/data/types";
import { audienceLine, formatLongDate, formatPrice, paragraphs, showBadges, ticketSite, timeLine } from "@/lib/show-page";
import { SITE_URL } from "@/lib/site";

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const h2 = "font-display text-[24px] md:text-[32px]";

export async function generateMetadata({ params }: PageProps<"/shows/[slug]">): Promise<Metadata> {
  const show = await getShow((await params).slug);
  if (!show) return { title: "Show not found" };
  const who = show.performers[0]?.name;
  const date = formatShowDate(new Date(show.starts_at)).split(" · ")[0];
  // Spec 12: "[Comedian] live in [City] — [Date]"
  const title = who ? `${who} live in ${show.city.name} — ${date}` : `${show.title} — ${show.city.name}, ${date}`;
  const description = show.description?.slice(0, 160) ?? `${show.title} in ${show.city.name}. Date, venue and tickets on Comedy Radar.`;
  return {
    title,
    description,
    alternates: { canonical: `/shows/${show.slug}` },
    openGraph: { title, description, images: show.poster_url ? [show.poster_url] : undefined },
  };
}

/** Show page (docs/website-spec.md, section 6.1). */
export default function ShowPage({ params }: PageProps<"/shows/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense fallback={<ShowSkeleton />}>
          <ShowContent params={params} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}

function ShowSkeleton() {
  return (
    <div className={`${container} grid gap-6 pb-14 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-10`} aria-hidden="true">
      <div className="aspect-[4/5] rounded-[22px] bg-radar-plum md:rounded-[28px]" />
      <div className="flex flex-col gap-4">
        <div className="h-12 w-3/4 rounded-lg bg-radar-plum" />
        <div className="h-64 rounded-card bg-radar-plum" />
      </div>
    </div>
  );
}

function TicketCta({ show, id, compact = false }: { show: ShowDetail; id?: string; compact?: boolean }) {
  if (show.status !== "published" || !show.ticket_url) {
    const text = show.status === "sold_out" ? "Sold out" : "Tickets soon";
    return (
      <span
        id={id}
        className={`block rounded-[14px] border-2 border-plum-line text-center font-extrabold text-lavender-text ${
          compact ? "px-4 py-3 text-[15px]" : "p-4 text-[17px] md:text-lg"
        }`}
      >
        {text}
      </span>
    );
  }
  return (
    <TrackedLink
      id={id}
      href={show.ticket_url}
      target="_blank"
      rel="noopener"
      event={ticketsClickEvent({
        id: show.id,
        title: show.title,
        performer: show.performers[0]?.name,
        city: show.city.name,
        zone: show.zone,
      })}
      className={`block rounded-[14px] bg-spotlight-yellow text-center font-extrabold text-radar-purple hover:bg-white ${
        compact ? "px-[18px] py-3 text-[15px]" : "p-4 text-[17px] md:text-lg"
      }`}
    >
      Get tickets
    </TrackedLink>
  );
}

function PerformerRow({ show }: { show: ShowDetail }) {
  const main = show.performers[0];
  if (!main) return null;
  const href = main.kind === "group" ? `/groups/${main.slug}` : `/comedians/${main.slug}`;
  const sub =
    main.kind === "group"
      ? `Comedy group${main.members.length ? ` · ${main.members.length} comedians` : ""}`
      : show.performers.length > 1
        ? `With ${show.performers.length - 1} more on the lineup`
        : "Comedian";
  return (
    <div className="flex items-center gap-3">
      <Avatar person={main} ring={main.kind === "group" ? "yellow" : "pink"} size="h-11 w-11 md:h-12 md:w-12" />
      <div className="flex min-w-0 flex-col">
        <Link href={href} className="text-[17px] font-extrabold text-spotlight-yellow hover:text-white md:text-[19px]">
          {main.name}
        </Link>
        <span className="text-[13px] text-lavender-text md:text-small">{sub}</span>
      </div>
    </div>
  );
}

function DetailsPanel({ show }: { show: ShowDetail }) {
  const starts = new Date(show.starts_at);
  const ends = show.ends_at ? new Date(show.ends_at) : null;
  const cancelled = show.status === "cancelled";
  const price = formatPrice(show.price_min, show.price_max, show.currency);
  const audience = audienceLine(show.language, show.age_rating);
  const site = ticketSite(show.ticket_url);
  const place = [show.venue?.address, show.city.name, show.city.country_name].filter(Boolean).join(", ");
  const strike = cancelled ? "line-through text-lavender-text" : "";

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-radar-plum p-4 md:gap-3.5 md:rounded-[20px] md:px-[22px] md:py-5">
      <div className="flex gap-3">
        <CalendarIcon />
        <div>
          <p className={`text-[15px] font-extrabold md:text-base ${strike}`}>{formatLongDate(starts)}</p>
          <p className={`text-[13px] text-lavender-text md:text-small ${cancelled ? "line-through" : ""}`}>{timeLine(starts, ends, show.doors_at ? new Date(show.doors_at) : null)}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <PinIcon />
        <div>
          <p className={`text-[15px] font-extrabold md:text-base ${strike}`}>{show.venue?.name ?? "Venue to be announced"}</p>
          <p className="text-[13px] text-lavender-text md:text-small">
            {place}
            {show.venue?.map_url && !cancelled && (
              <>
                {" · "}
                <a href={show.venue.map_url} target="_blank" rel="noopener" className="font-extrabold text-spotlight-yellow hover:text-white">
                  Get directions
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      {audience && (
        <div className="flex gap-3">
          <TicketIcon />
          <div>
            <p className="text-[15px] font-extrabold md:text-base">{audience}</p>
            <p className="hidden text-small text-lavender-text md:block">Language and age set by the organiser</p>
          </div>
        </div>
      )}
      {cancelled ? (
        <p className="border-t-2 border-plum-line pt-3 text-base">No tickets are on sale for this show.</p>
      ) : (
        <>
          {price && (
            <div className="flex items-baseline justify-between gap-3 border-t-2 border-plum-line pt-3 md:pt-3.5">
              <span className="text-[13px] text-lavender-text md:text-small">Tickets</span>
              <span className="text-[19px] font-extrabold md:text-[22px]">{price}</span>
            </div>
          )}
          <TicketCta show={show} id="main-tickets" />
          {show.status === "published" && site && (
            <p className="text-center text-xs text-lavender-text md:text-[13px]">
              You will buy tickets on {site}. Opens in a new tab.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function OnStage({ show }: { show: ShowDetail }) {
  if (show.performers.length === 0) return null;
  const group = show.performers.find((p) => p.kind === "group") ?? null;
  const comedians: Person[] = [
    ...(group && group.kind === "group" ? group.members : []),
    ...show.performers.filter((p) => p.kind === "comedian"),
  ].filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i);

  return (
    <section aria-labelledby="on-stage" className={`${container} flex flex-col gap-3 pb-8 md:gap-5 md:pb-14`}>
      <h2 id="on-stage" className={h2}>
        On <span className="text-spotlight-yellow">stage</span>
      </h2>
      <LineupCard group={group} comedians={comedians} />
    </section>
  );
}

function Venue({ show }: { show: ShowDetail }) {
  const v = show.venue;
  if (!v) return null;
  const address = [v.address, show.city.name, show.city.country_name].filter(Boolean).join(", ");
  return (
    <section aria-labelledby="the-venue" className={`${container} flex flex-col gap-3 pb-8 md:gap-5 md:pb-14`}>
      <h2 id="the-venue" className={h2}>
        The venue
      </h2>
      <div className="flex flex-col gap-3 rounded-[18px] bg-radar-plum p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-[24px] md:p-6">
        <div className="flex gap-3">
          <PinIcon />
          <div className="flex flex-col gap-1">
            <h3 className="text-[17px] font-extrabold md:text-xl">{v.name}</h3>
            <p className="text-small text-lavender-text">{address}</p>
            {v.capacity ? <p className="text-small text-lavender-text">Capacity {v.capacity.toLocaleString("en-US")}</p> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {v.map_url && (
            <a
              href={v.map_url}
              target="_blank"
              rel="noopener"
              className="flex min-h-11 flex-1 items-center justify-center rounded-button bg-spotlight-yellow px-4 text-sm font-extrabold text-radar-purple hover:bg-white md:flex-none md:text-[15px]"
            >
              Get directions
            </a>
          )}
          <Link
            href={`/shows?venue=${v.slug}`}
            className="flex min-h-11 flex-1 items-center justify-center rounded-button border-2 border-plum-line px-4 text-sm font-bold hover:border-spotlight-yellow md:flex-none md:text-[15px]"
          >
            <span className="md:hidden">Venue shows</span>
            <span className="hidden md:inline">All shows at this venue</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ShowRowSection({ id, title, accent, href, shows }: { id: string; title: string; accent: React.ReactNode; href: string; shows: ShowRow[] }) {
  if (shows.length === 0) return null;
  const now = new Date();
  return (
    <section aria-labelledby={id} className={`${container} flex flex-col gap-3 pb-8 md:gap-5 md:pb-14`}>
      <div className="flex items-end justify-between gap-3">
        <h2 id={id} className="font-display text-[22px] md:text-[32px]">
          {title} {accent}
        </h2>
        <Link href={href} className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-base">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
        {shows.map((s) => (
          <ShowCard key={s.id} show={s} now={now} />
        ))}
      </div>
    </section>
  );
}

function eventJsonLd(show: ShowDetail) {
  const status =
    show.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: show.title,
    startDate: show.starts_at,
    ...(show.ends_at ? { endDate: show.ends_at } : {}),
    eventStatus: status,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${SITE_URL}/shows/${show.slug}`,
    ...(show.poster_url ? { image: [show.poster_url] } : {}),
    ...(show.description ? { description: show.description } : {}),
    location: {
      "@type": "Place",
      name: show.venue?.name ?? show.city.name,
      address: {
        "@type": "PostalAddress",
        ...(show.venue?.address ? { streetAddress: show.venue.address } : {}),
        addressLocality: show.city.name,
        addressCountry: show.city.country_code,
      },
    },
    performer: show.performers.map((p) => ({
      "@type": p.kind === "group" ? "PerformingGroup" : "Person",
      name: p.name,
      url: `${SITE_URL}/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}`,
    })),
    ...(show.ticket_url && show.status !== "cancelled"
      ? {
          offers: {
            "@type": "Offer",
            url: show.ticket_url,
            availability: show.status === "sold_out" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            ...(show.price_min != null ? { price: show.price_min, priceCurrency: show.currency } : {}),
          },
        }
      : {}),
  };
}

async function ShowContent({ params }: { params: PageProps<"/shows/[slug]">["params"] }) {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) notFound();

  const now = new Date();
  const cancelled = show.status === "cancelled";
  const badges = showBadges(show, show.performers, now);
  const comedianIds = show.performers.flatMap((p) => (p.kind === "group" ? p.members.map((m) => m.id) : [p.id]));
  const groupIds = show.performers.filter((p) => p.kind === "group").map((p) => p.id);
  const related = await getRelatedShows(show.id, show.city.slug, comedianIds, groupIds);
  const about = paragraphs(show.description);
  const goodToKnow = (show.good_to_know ?? []).map((x) => x.trim()).filter(Boolean);
  const main = show.performers[0];
  const location = [show.venue?.name, show.venue?.address, show.city.name].filter(Boolean).join(", ");

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD for search engines; "<" is escaped so the text cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(show)).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className={`${container} pt-1 pb-3 text-[13px] text-lavender-text md:pt-2 md:pb-5 md:text-small`}>
        <Link href="/" className="hidden hover:text-white md:inline">
          Home
        </Link>
        <span aria-hidden="true" className="hidden md:inline">
          {" "}›{" "}
        </span>
        <Link href="/shows" className="hover:text-white">
          Shows
        </Link>{" "}
        <span aria-hidden="true">›</span>{" "}
        <Link href={`/shows?city=${show.city.slug}`} className="hover:text-white">
          {show.city.name}
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="font-bold text-white">{show.title}</span>
      </nav>

      {cancelled && (
        <div className={`${container} pb-5`}>
          <div role="status" className="flex items-center gap-4 rounded-2xl bg-laugh-pink px-4 py-4 text-radar-purple md:px-[22px] md:py-[18px]">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-radar-purple text-[22px] font-extrabold text-laugh-pink">
              !
            </span>
            <div className="flex flex-col gap-0.5">
              <strong className="text-[17px] md:text-lg">This show was cancelled</strong>
              <span className="text-small md:text-[15px]">If you bought tickets, contact the ticket seller about refunds.</span>
            </div>
          </div>
        </div>
      )}

      <section className={`${container} grid gap-5 pb-8 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:items-start md:gap-10 md:pb-14`}>
        <div className="relative overflow-hidden rounded-[22px] md:rounded-[28px]">
          <CoverImage src={show.poster_url} alt={`Poster for ${show.title}`} iconSize={88} className="aspect-[4/5] w-full" />
          {cancelled && <span aria-hidden="true" className="absolute inset-0 bg-radar-purple/55" />}
        </div>

        <div className="flex flex-col gap-3.5 md:gap-[18px]">
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {badges.map((b) => (
              <Badge key={b.label} tone={b.tone} size="md">
                {b.label}
              </Badge>
            ))}
          </div>
          <h1
            className={`font-display text-[36px] leading-[1.02] md:text-[52px] md:leading-none ${
              cancelled ? "text-lavender-text line-through decoration-laugh-pink" : ""
            }`}
          >
            {show.title}
          </h1>
          <PerformerRow show={show} />
          {show.tour && (
            <Link
              href={`/tours/${show.tour.slug}`}
              className="block rounded-xl bg-radar-plum px-3.5 py-3 text-small font-bold hover:bg-plum-deep md:self-start md:rounded-full md:px-4 md:py-2"
            >
              Part of <span className="font-extrabold text-spotlight-yellow">{show.tour.name}</span> · see all dates ›
            </Link>
          )}
          <DetailsPanel show={show} />
          {cancelled ? (
            main && (
              <Link
                href={main.kind === "group" ? `/groups/${main.slug}` : `/comedians/${main.slug}`}
                className="inline-flex min-h-12 items-center justify-center self-start rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple hover:bg-white"
              >
                See {main.name}&apos;s next shows
              </Link>
            )
          ) : (
            <ShowActions
              id={show.id}
              slug={show.slug}
              title={show.title}
              startsAt={show.starts_at}
              endsAt={show.ends_at}
              location={location}
              siteUrl={SITE_URL}
            />
          )}
        </div>
      </section>

      {(about.length > 0 || goodToKnow.length > 0) && (
        <section className={`${container} grid gap-6 pb-8 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-10 md:pb-14`}>
          {about.length > 0 && (
            <div className="flex flex-col gap-2.5 md:gap-3.5">
              <h2 id="about-show" className={h2}>
                About the show
              </h2>
              <div className="flex flex-col gap-3 text-[15px] leading-6 text-lavender md:text-[17px] md:leading-7">
                {about.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          )}
          {goodToKnow.length > 0 && (
            <div className="flex flex-col gap-2.5 md:gap-3.5">
              <h2 className={h2}>Good to know</h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-[21px] text-lavender md:gap-2 md:text-base md:leading-6">
                {goodToKnow.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <OnStage show={show} />
      <Venue show={show} />

      {main && (
        <ShowRowSection
          id="more-from"
          title="More from"
          accent={<span className="text-spotlight-yellow">{main.name}</span>}
          href={main.kind === "group" ? `/groups/${main.slug}` : `/comedians/${main.slug}`}
          shows={related.fromPerformers}
        />
      )}
      <ShowRowSection
        id="more-in"
        title="More in"
        accent={<span className="text-laugh-pink">{show.city.name}</span>}
        href={`/shows?city=${show.city.slug}`}
        shows={related.inCity}
      />

      {!cancelled && (
        <StickyTicketBar targetId="main-tickets" dateLine={formatShowDate(new Date(show.starts_at))}>
          <TicketCta show={show} compact />
        </StickyTicketBar>
      )}
    </>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0 text-spotlight-yellow">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10 H21 M8 3 V7 M16 3 V7" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0 text-spotlight-yellow">
      <path d="M12 21 C7 15 5 12 5 9 A7 7 0 0 1 19 9 C19 12 17 15 12 21 Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0 text-spotlight-yellow">
      <path d="M4 6 H20 V18 H4 Z M8 10 H16 M8 14 H13" />
    </svg>
  );
}
