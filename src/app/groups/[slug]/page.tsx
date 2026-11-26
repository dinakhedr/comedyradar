import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/badge";
import { languageLine, styleLabel } from "@/lib/group-styles";
import { Avatar } from "@/components/lineup-card";
import { NewsletterBand } from "@/components/newsletter-band";
import { CoverImage } from "@/components/placeholder-image";
import { ShareButton } from "@/components/share-button";
import { ShowCard } from "@/components/show-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SocialLinks } from "@/components/social-links";
import { TourWideCard } from "@/components/tour-wide-card";
import { getGroup, type GroupDetail } from "@/lib/data/group";
import { formatShowDate } from "@/lib/dates";
import { paragraphs } from "@/lib/show-page";
import { ticketLink } from "@/lib/show-display";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { ticketsClickEvent } from "@/lib/analytics-events";
import { SITE_URL } from "@/lib/site";
import { TrackView } from "@/components/page-tracker";

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const h2 = "font-display text-[26px] md:text-[36px]";

export async function generateMetadata({ params }: PageProps<"/groups/[slug]">): Promise<Metadata> {
  const group = await getGroup((await params).slug);
  if (!group) return { title: "Group not found" };
  // Spec 12: "[Group] — shows and tours"
  const title = `${group.name} — shows and tours`;
  const description =
    group.bio?.slice(0, 160) ??
    `${group.name} is a comedy group${group.members.length ? ` of ${group.members.length} comedians` : ""}. Upcoming shows, tours and members.`;
  return {
    title,
    description,
    alternates: { canonical: `/groups/${group.slug}` },
    openGraph: { title, description, images: group.photo_url ? [group.photo_url] : undefined },
  };
}

/** Group page (docs/website-spec.md, section 6.3). */
export default function GroupPage({ params }: PageProps<"/groups/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense fallback={<div className={`${container} pb-14`} aria-hidden="true"><div className="h-[560px] rounded-[28px] bg-radar-plum" /></div>}>
          <GroupContent params={params} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}

function groupJsonLd(g: GroupDetail) {
  const sameAs = [g.instagram_url, g.tiktok_url, g.youtube_url, g.facebook_url].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "PerformingGroup",
    name: g.name,
    url: `${SITE_URL}/groups/${g.slug}`,
    ...(g.bio ? { description: g.bio } : {}),
    ...(g.photo_url ? { image: g.photo_url } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    member: g.members.map((m) => ({ "@type": "Person", name: m.name, url: `${SITE_URL}/comedians/${m.slug}` })),
  };
}

function memberLine(m: GroupDetail["members"][number]): string {
  const parts = [];
  if (m.solo_count > 0) parts.push(`${m.solo_count} solo ${m.solo_count === 1 ? "show" : "shows"}`);
  if (m.hosts_podcast) parts.push("podcast");
  return parts.join(" · ") || "Comedian";
}

async function GroupContent({ params }: { params: PageProps<"/groups/[slug]">["params"] }) {
  const { slug } = await params;
  const g = await getGroup(slug);
  if (!g) notFound();

  const now = new Date();
  const bio = paragraphs(g.bio);
  const links = [
    { href: "#g-members", label: `Members (${g.members.length})`, show: g.members.length > 0 },
    { href: "#g-shows", label: `Group shows (${g.shows.length})`, show: g.shows.length > 0 },
    { href: "#g-tours", label: `Tours (${g.tours.length})`, show: g.tours.length > 0 },
    { href: "#g-solo", label: "Members' solo shows", show: g.soloShows.length > 0 },
  ].filter((l) => l.show);

  return (
    <>
      <TrackView kind="group_view" id={g.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(groupJsonLd(g)).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className={`${container} pt-1 pb-3 text-[13px] text-lavender-text md:pt-2 md:pb-5 md:text-small`}>
        <Link href="/" className="hover:text-white">
          Home
        </Link>{" "}
        <span aria-hidden="true">›</span>{" "}
        <Link href="/groups" className="hover:text-white">
          Groups
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="font-bold text-white">{g.name}</span>
      </nav>

      {/* Group header card */}
      <section className={`${container} pb-6 md:pb-8`}>
        <div className="overflow-hidden rounded-[22px] bg-radar-plum md:rounded-[28px]">
          <CoverImage src={g.photo_url} alt={`${g.name}`} iconSize={80} tone="deep" className="h-[220px] w-full md:h-[340px]" />
          <div className="flex flex-col gap-5 p-4 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-9 md:px-9 md:py-8">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Badge tone="yellow" size="md">
                  Comedy group
                </Badge>
                {g.country_name && (
                  <Badge tone="purple" size="md">
                    From {g.country_name}
                  </Badge>
                )}
                {g.tours.length > 0 && (
                  <Badge tone="pink" size="md">
                    On tour
                  </Badge>
                )}
                {g.styles.map((s) => (
                  <Badge key={s} tone="purple" size="md">
                    {styleLabel(s)}
                  </Badge>
                ))}
                {g.performing_language && (
                  <Badge tone="outline" size="md">
                    {languageLine(g.performing_language)}
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-[44px] leading-none md:text-[64px]">{g.name}</h1>
              {bio.length > 0 && (
                <div className="flex flex-col gap-2 text-[15px] leading-6 text-lavender md:text-[17px] md:leading-[27px]">
                  {bio.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2.5">
                <ShareButton
                  title={g.name}
                  url={`${SITE_URL}/groups/${g.slug}`}
                  className="inline-flex min-h-11 items-center rounded-button border-2 border-plum-line px-[18px] text-[15px] font-bold hover:border-spotlight-yellow"
                />
                <SocialLinks socials={g} name={g.name} />
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                [g.members.length, g.members.length === 1 ? "comedian" : "comedians"],
                [g.shows.length, g.shows.length === 1 ? "upcoming show" : "upcoming shows"],
                [g.tours.length, g.tours.length === 1 ? "tour" : "tours"],
              ].map(([n, label]) => (
                <div key={label} className="flex flex-col gap-0.5 rounded-2xl bg-radar-purple p-3 md:p-4">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-[28px] leading-tight text-spotlight-yellow md:text-[36px]">{n}</dd>
                  <dd className="text-[13px] text-lavender-text md:text-small">{label}</dd>
                </div>
              ))}
            </dl>
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
                i === 0
                  ? "bg-spotlight-yellow font-extrabold text-radar-purple"
                  : "border-2 border-plum-line font-bold hover:border-spotlight-yellow"
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}

      {g.members.length > 0 && (
        <section id="g-members" aria-labelledby="members-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
          <div className="flex flex-col gap-1.5">
            <h2 id="members-title" className={h2}>
              The <span className="text-spotlight-yellow">members</span>
            </h2>
            <p className="text-[15px] text-lavender-text md:text-base">Each member has their own page with solo shows and podcasts.</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-5">
            {g.members.map((m, i) => (
              <li key={m.id}>
                <Link
                  href={`/comedians/${m.slug}`}
                  className="group flex items-center gap-3.5 rounded-2xl bg-radar-plum p-3 md:h-full md:flex-col md:gap-2.5 md:rounded-[20px] md:px-4 md:py-[22px] md:text-center"
                >
                  <Avatar person={m} ring={i % 2 === 0 ? "yellow" : "pink"} size="h-16 w-16 md:h-[120px] md:w-[120px] md:border-4" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:items-center md:gap-1.5">
                    <span className="text-base font-extrabold group-hover:text-spotlight-yellow md:text-lg">{m.name}</span>
                    <span className="text-[13px] text-lavender-text">{memberLine(m)}</span>
                    <span className="hidden text-sm font-extrabold text-spotlight-yellow md:inline">View profile ›</span>
                  </span>
                  <span aria-hidden="true" className="text-xl font-extrabold text-spotlight-yellow md:hidden">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="g-shows" aria-labelledby="shows-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
        <h2 id="shows-title" className={h2}>
          Group <span className="text-spotlight-yellow">shows</span>
        </h2>
        {g.shows.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
            {g.shows.map((s) => (
              <ShowCard key={s.id} show={s} now={now} />
            ))}
          </div>
        ) : (
          <p className="rounded-card bg-radar-plum p-5 text-base text-lavender-text">
            No group shows on the radar right now. New dates will show up here as soon as they are announced.
          </p>
        )}
      </section>

      {g.tours.length > 0 && (
        <section id="g-tours" aria-labelledby="tours-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
          <h2 id="tours-title" className={h2}>
            On <span className="text-laugh-pink">tour</span>
          </h2>
          {g.tours.map((t) => (
            <TourWideCard key={t.id} tour={t} label="Group tour" />
          ))}
        </section>
      )}

      {g.soloShows.length > 0 && (
        <section id="g-solo" aria-labelledby="solo-title" className={`${container} flex scroll-mt-4 flex-col gap-4 pb-10 md:gap-5 md:pb-16`}>
          <div className="flex flex-col gap-1.5">
            <h2 id="solo-title" className={h2}>
              Members&apos; <span className="text-spotlight-yellow">solo shows</span>
            </h2>
            <p className="text-[15px] text-lavender-text md:text-base">Catch each member on their own.</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-5">
            {g.soloShows.map(({ member, show }, i) => {
              const link = ticketLink(show);
              return (
                <li key={member.id} className="relative flex items-center gap-3 rounded-[18px] bg-radar-plum p-3.5">
                  <Avatar person={member} ring={i % 2 === 0 ? "yellow" : "pink"} size="h-16 w-16" />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs font-extrabold text-spotlight-yellow uppercase">
                      {formatShowDate(new Date(show.starts_at)).split(" · ")[0]}
                    </span>
                    <h3 className="truncate text-[15px] font-extrabold">
                      <Link href={`/shows/${show.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-spotlight-yellow">
                        {member.name}
                      </Link>
                    </h3>
                    <span className="truncate text-xs text-lavender-text">
                      {show.title} · {show.city_name}
                    </span>
                    {show.status === "sold_out" ? (
                      <span className="text-[13px] font-extrabold text-lavender-text">Sold out</span>
                    ) : (
                      <TrackedLink
                        href={link.href}
                        {...(link.external ? { target: "_blank", rel: "noopener" } : {})}
                        className="relative z-10 text-[13px] font-extrabold text-spotlight-yellow hover:text-white"
                        event={ticketsClickEvent({
                          id: show.id,
                          title: show.title,
                          performer: member.name,
                          city: show.city_name,
                          zone: show.zone,
                        })}
                      >
                        Get tickets ›
                      </TrackedLink>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
