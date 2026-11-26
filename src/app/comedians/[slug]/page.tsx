import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/lineup-card";
import { NewsletterBand } from "@/components/newsletter-band";
import { CoverImage } from "@/components/placeholder-image";
import { ShareButton } from "@/components/share-button";
import { ShowCard } from "@/components/show-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SocialLinks } from "@/components/social-links";
import { TourWideCard } from "@/components/tour-wide-card";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { podcastPlatform } from "@/lib/analytics-events";
import { getComedian, type ComedianDetail, type Podcast } from "@/lib/data/comedian";
import { whenRange } from "@/lib/dates";
import { comedianShowBadge, hasShowBetween, tourLabel } from "@/lib/profile-page";
import { paragraphs } from "@/lib/show-page";
import { SITE_URL } from "@/lib/site";
import { TrackView } from "@/components/page-tracker";

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const h2 = "font-display text-[26px] md:text-[36px]";

export async function generateMetadata({ params }: PageProps<"/comedians/[slug]">): Promise<Metadata> {
  const c = await getComedian((await params).slug);
  if (!c) return { title: "Comedian not found" };
  const title = `${c.name} — shows, tours and podcasts`;
  const description = c.bio?.slice(0, 160) ?? `${c.name}: upcoming stand-up shows, tours and podcasts on Comedy Radar.`;
  return {
    title,
    description,
    alternates: { canonical: `/comedians/${c.slug}` },
    openGraph: { title, description, images: c.photo_url ? [c.photo_url] : undefined },
  };
}

/** Comedian page (docs/website-spec.md, section 6.4). */
export default function ComedianPage({ params }: PageProps<"/comedians/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense
          fallback={
            <div className={`${container} pb-14`} aria-hidden="true">
              <div className="h-[520px] rounded-[28px] bg-radar-plum md:h-[412px]" />
            </div>
          }
        >
          <ComedianContent params={params} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}

function jsonLd(c: ComedianDetail) {
  const sameAs = [c.instagram_url, c.tiktok_url, c.youtube_url, c.facebook_url].filter(Boolean);
  const url = `${SITE_URL}/comedians/${c.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: c.name,
      url,
      jobTitle: "Comedian",
      ...(c.bio ? { description: c.bio } : {}),
      ...(c.photo_url ? { image: c.photo_url } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      ...(c.groups.length
        ? { memberOf: c.groups.map((g) => ({ "@type": "PerformingGroup", name: g.name, url: `${SITE_URL}/groups/${g.slug}` })) }
        : {}),
    },
    ...c.podcasts.map((p) => ({
      "@context": "https://schema.org",
      "@type": "PodcastSeries",
      name: p.name,
      ...(p.description ? { description: p.description } : {}),
      ...(p.cover_url ? { image: p.cover_url } : {}),
      ...(p.links[0] ? { url: p.links[0].url } : {}),
      author: [c, ...p.coHosts].map((h) => ({ "@type": "Person", name: h.name, url: `${SITE_URL}/comedians/${h.slug}` })),
    })),
  ];
}

/** A listen button; Apple, Spotify, Anghami and podU clicks send `podcast_link_click`. */
function PodcastLink({ podcast, label, url }: { podcast: string; label: string; url: string }) {
  const cls =
    "inline-flex min-h-11 items-center rounded-button bg-white px-4 text-sm font-extrabold text-radar-purple hover:bg-spotlight-yellow";
  const platform = podcastPlatform(label);
  if (!platform) {
    return (
      <a href={url} target="_blank" rel="noopener" className={cls}>
        {label}
      </a>
    );
  }
  return (
    <TrackedLink href={url} target="_blank" rel="noopener" className={cls} event={{ name: "podcast_link_click", params: { podcast, platform } }}>
      {label}
    </TrackedLink>
  );
}

function PodcastCard({ podcast }: { podcast: Podcast }) {
  const label = [podcast.coHosts.length ? "Co-hosted" : "Solo", podcast.is_active ? null : "No new episodes"].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col gap-4 rounded-[18px] bg-radar-plum p-4 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:gap-7 md:rounded-[24px] md:p-6">
      <CoverImage src={podcast.cover_url} alt={`${podcast.name} cover`} iconSize={48} tone="deep" className="aspect-square w-[120px] rounded-2xl md:w-[180px] md:rounded-[20px]" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-display text-[24px] leading-tight md:text-[30px]">{podcast.name}</h3>
          <Badge tone="purple">{label}</Badge>
        </div>
        {podcast.coHosts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-small text-lavender-text">Hosted with</span>
            {podcast.coHosts.map((h, i) => (
              <Link
                key={h.id}
                href={`/comedians/${h.slug}`}
                className="flex min-h-9 items-center gap-1.5 rounded-full bg-radar-purple py-1 pr-3 pl-1 text-small font-bold hover:text-spotlight-yellow"
              >
                <Avatar person={h} ring={i % 2 === 0 ? "pink" : "yellow"} size="h-[26px] w-[26px] !border-2" />
                {h.name}
              </Link>
            ))}
          </div>
        )}
        {podcast.description && <p className="text-[15px] leading-6 text-lavender">{podcast.description}</p>}
        {podcast.links.length > 0 && (
          <ul className="flex flex-wrap gap-2.5" aria-label={`Listen to ${podcast.name}`}>
            {podcast.links.map((l) => (
              <li key={l.label}>
                <PodcastLink podcast={podcast.name} label={l.label} url={l.url} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

async function ComedianContent({ params }: { params: PageProps<"/comedians/[slug]">["params"] }) {
  const { slug } = await params;
  const c = await getComedian(slug);
  if (!c) notFound();

  const now = new Date();
  const month = whenRange("month", now);
  const thisMonth = hasShowBetween(c.shows, month.from, month.to);
  const bio = paragraphs(c.bio);
  const links = [
    { href: "#c-shows", label: `Shows (${c.shows.length})`, n: c.shows.length },
    { href: "#c-tours", label: `Tours (${c.tours.length})`, n: c.tours.length },
    { href: "#c-podcasts", label: `Podcasts (${c.podcasts.length})`, n: c.podcasts.length },
    { href: "#c-groups", label: `Groups (${c.groups.length})`, n: c.groups.length },
  ].filter((l) => l.n > 0);

  return (
    <>
      <TrackView kind="comedian_view" id={c.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c)).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className={`${container} pt-1 pb-3 text-[13px] text-lavender-text md:pt-2 md:pb-5 md:text-small`}>
        <Link href="/" className="hover:text-white">
          Home
        </Link>{" "}
        <span aria-hidden="true">›</span>{" "}
        <Link href="/comedians" className="hover:text-white">
          Comedians
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="font-bold text-white">{c.name}</span>
      </nav>

      {/* Profile card */}
      <section className={`${container} pb-6 md:pb-8`}>
        <div className="flex flex-col items-center gap-5 rounded-[22px] bg-radar-plum p-5 text-center md:grid md:grid-cols-[340px_minmax(0,1fr)] md:items-center md:gap-10 md:rounded-[28px] md:p-9 md:text-left">
          <span className="block h-[200px] w-[200px] overflow-hidden rounded-full border-[5px] border-spotlight-yellow md:h-[340px] md:w-[340px] md:border-[6px]">
            <CoverImage src={c.photo_url} alt={c.name} iconSize={96} tone="deep" className="h-full w-full" />
          </span>
          <div className="flex flex-col items-center gap-3.5 md:items-start md:gap-4">
            <div className="flex flex-wrap justify-center gap-1.5 md:justify-start md:gap-2">
              <Badge tone="pink" size="md">
                Comedian
              </Badge>
              {c.country_name && (
                <Badge tone="purple" size="md">
                  From {c.country_name}
                </Badge>
              )}
              {thisMonth && (
                <Badge tone="yellow" size="md">
                  Performing this month
                </Badge>
              )}
            </div>
            <h1 className="font-display text-[40px] leading-none md:text-[60px]">{c.name}</h1>
            {bio.length > 0 && (
              <div className="flex max-w-[680px] flex-col gap-2 text-[15px] leading-6 text-lavender md:text-[17px] md:leading-[27px]">
                {bio.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
            )}
            {c.groups.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
                <span className="text-small font-bold text-lavender-text">Member of</span>
                {c.groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.slug}`}
                    className="flex min-h-11 items-center gap-2 rounded-full border-2 border-spotlight-yellow bg-radar-purple py-1.5 pr-3.5 pl-1.5 text-[15px] font-extrabold hover:text-spotlight-yellow"
                  >
                    <span className="block h-[30px] w-[30px] overflow-hidden rounded-full">
                      <CoverImage src={g.photo_url} alt="" iconSize={16} tone="deep" className="h-full w-full" />
                    </span>
                    {g.name} ›
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
              <ShareButton
                title={c.name}
                url={`${SITE_URL}/comedians/${c.slug}`}
              />
              <SocialLinks socials={c} name={c.name} />
            </div>
          </div>
        </div>
      </section>

      {links.length > 1 && (
        <nav aria-label="On this page" className={`${container} no-scrollbar flex gap-2 overflow-x-auto pb-8 md:gap-2.5 md:pb-10`}>
          {links.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-5 text-[15px] ${
                i === 0 ? "bg-spotlight-yellow font-extrabold text-radar-purple" : "border-2 border-plum-line font-bold hover:border-spotlight-yellow"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}

      <section id="c-shows" aria-labelledby="shows-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
        <h2 id="shows-title" className={h2}>
          Upcoming <span className="text-spotlight-yellow">shows</span>
        </h2>
        {c.shows.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
            {c.shows.map((s) => (
              <ShowCard key={s.id} show={s} now={now} badge={comedianShowBadge(s, c.groups)} />
            ))}
          </div>
        ) : (
          <p className="rounded-card bg-radar-plum p-5 text-base text-lavender-text md:p-6 md:text-lg">
            <span className="font-extrabold text-white">No dates on the radar yet.</span> New shows will appear here as soon as they are announced.
          </p>
        )}
      </section>

      {c.tours.length > 0 && (
        <section id="c-tours" aria-labelledby="tours-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
          <h2 id="tours-title" className={h2}>
            On <span className="text-laugh-pink">tour</span>
          </h2>
          {c.tours.map((t) => (
            <TourWideCard key={t.id} tour={t} label={tourLabel(t)} />
          ))}
        </section>
      )}

      {c.podcasts.length > 0 && (
        <section id="c-podcasts" aria-labelledby="podcasts-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
          <div className="flex flex-col gap-1.5">
            <h2 id="podcasts-title" className={h2}>
              Podcasts
            </h2>
            <p className="text-[15px] text-lavender-text md:text-base">Shows this comedian hosts. Listen on your favourite app.</p>
          </div>
          {c.podcasts.map((p) => (
            <PodcastCard key={p.id} podcast={p} />
          ))}
        </section>
      )}

      {c.groups.length > 0 && (
        <section id="c-groups" aria-labelledby="groups-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-16`}>
          <h2 id="groups-title" className={h2}>
            Groups
          </h2>
          {c.groups.map((g) => (
            <article
              key={g.id}
              className="flex flex-col gap-4 rounded-[18px] bg-radar-plum p-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center md:gap-7 md:rounded-[24px] md:p-6"
            >
              <div className="flex items-center gap-4">
                <CoverImage src={g.photo_url} alt="" iconSize={36} tone="deep" className="h-20 w-20 shrink-0 rounded-2xl md:h-28 md:w-28" />
                <div className="flex flex-col items-start gap-1">
                  <Badge tone="yellow">Group</Badge>
                  <h3 className="font-display text-[24px] leading-tight md:text-[28px]">{g.name}</h3>
                  <p className="text-small text-lavender-text">
                    {g.member_count} {g.member_count === 1 ? "comedian" : "comedians"} · {g.upcoming_count}{" "}
                    {g.upcoming_count === 1 ? "upcoming show" : "upcoming shows"}
                  </p>
                  <Link href={`/groups/${g.slug}`} className="text-small font-extrabold text-spotlight-yellow hover:text-white">
                    View group page ›
                  </Link>
                </div>
              </div>
              {g.otherMembers.length > 0 && (
                <ul className="flex flex-wrap gap-3 md:gap-4" aria-label={`Other members of ${g.name}`}>
                  {g.otherMembers.map((m, i) => (
                    <li key={m.id}>
                      <Link href={`/comedians/${m.slug}`} className="group flex w-[72px] flex-col items-center gap-1 text-center md:w-[88px]">
                        <Avatar person={m} ring={i % 2 === 0 ? "pink" : "yellow"} size="h-14 w-14 md:h-16 md:w-16" />
                        <span className="text-xs font-extrabold group-hover:text-spotlight-yellow">{m.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
