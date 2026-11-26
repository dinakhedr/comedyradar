import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/badge";
import { NewsletterBand } from "@/components/newsletter-band";
import { ShareButton } from "@/components/share-button";
import { ShowCard } from "@/components/show-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getVenue, type VenueDetail } from "@/lib/data/venue";
import { formatShowDate } from "@/lib/dates";
import { SITE_URL } from "@/lib/site";

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const h2 = "font-display text-[26px] md:text-[36px]";
const linkBtn =
  "inline-flex min-h-11 items-center rounded-button border-2 border-plum-line px-3.5 text-sm font-bold hover:border-spotlight-yellow";
const web = (u: string | null) => (u && /^https:\/\//i.test(u) ? u : null);

export async function generateMetadata({ params }: PageProps<"/venues/[slug]">): Promise<Metadata> {
  const v = await getVenue((await params).slug);
  if (!v) return { title: "Venue not found" };
  const title = `${v.name}, ${v.city.name} — comedy shows`;
  const description = `Upcoming stand-up comedy shows at ${v.name} in ${v.city.name}, with directions and links.`;
  return { title, description, alternates: { canonical: `/venues/${v.slug}` }, openGraph: { title, description } };
}

/** Venue page: where it is, its links, and every show there. */
export default function VenuePage({ params }: PageProps<"/venues/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main>
        <Suspense
          fallback={
            <div className={`${container} pb-14`} aria-hidden="true">
              <div className="h-[260px] rounded-[28px] bg-radar-plum" />
            </div>
          }
        >
          <VenueContent params={params} />
        </Suspense>
        <NewsletterBand />
      </main>
      <SiteFooter />
    </>
  );
}

function jsonLd(v: VenueDetail) {
  const sameAs = [v.website, v.instagram_url, v.facebook_url].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: v.name,
    url: `${SITE_URL}/venues/${v.slug}`,
    address: {
      "@type": "PostalAddress",
      ...(v.address ? { streetAddress: v.address } : {}),
      addressLocality: v.city.name,
      addressCountry: v.city.country_code,
    },
    ...(web(v.map_url) ? { hasMap: v.map_url } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

async function VenueContent({ params }: { params: PageProps<"/venues/[slug]">["params"] }) {
  const { slug } = await params;
  const v = await getVenue(slug);
  if (!v) notFound();
  const now = new Date();
  const links = [
    { label: "Get directions", href: web(v.map_url) },
    { label: "Website", href: web(v.website) },
    { label: "Instagram", href: web(v.instagram_url) },
    { label: "Facebook", href: web(v.facebook_url) },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(v)).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className={`${container} pt-1 pb-3 text-[13px] text-lavender-text md:pt-2 md:pb-5 md:text-small`}>
        <Link href="/" className="hover:text-white">
          Home
        </Link>{" "}
        <span aria-hidden="true">›</span>{" "}
        <Link href="/shows" className="hover:text-white">
          Shows
        </Link>{" "}
        <span aria-hidden="true">›</span> <span className="font-bold text-white">{v.name}</span>
      </nav>

      <section className={`${container} pb-8 md:pb-10`}>
        <div className="flex flex-col gap-4 rounded-[22px] bg-radar-plum p-5 md:rounded-[28px] md:p-9">
          <div className="flex flex-wrap gap-2">
            <Badge tone="pink" size="md">
              Venue
            </Badge>
            <Badge tone="purple" size="md">
              {v.city.name}, {v.city.country_name}
            </Badge>
            {v.shows.length > 0 && (
              <Badge tone="yellow" size="md">
                {v.shows.length === 1 ? "1 show coming up" : `${v.shows.length} shows coming up`}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-[40px] leading-none md:text-[60px]">{v.name}</h1>
          {v.name_ar && (
            <p dir="rtl" lang="ar" className="self-start text-lg font-bold text-lavender">
              {v.name_ar}
            </p>
          )}
          {v.address && <p className="text-base text-lavender md:text-lg">{v.address}</p>}
          <div className="flex flex-wrap items-center gap-2.5">
            {links.map((l, i) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener"
                className={
                  i === 0 && l.label === "Get directions"
                    ? "inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-4 text-sm font-extrabold text-radar-purple hover:bg-white"
                    : linkBtn
                }
              >
                {l.label}
              </a>
            ))}
            <ShareButton title={v.name} url={`${SITE_URL}/venues/${v.slug}`} className={linkBtn} />
          </div>
        </div>
      </section>

      <section aria-labelledby="shows-title" className={`${container} flex flex-col gap-4 pb-10 md:gap-5 md:pb-14`}>
        <h2 id="shows-title" className={h2}>
          Upcoming <span className="text-spotlight-yellow">shows</span>
        </h2>
        {v.shows.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
            {v.shows.map((s) => (
              <ShowCard key={s.id} show={s} now={now} />
            ))}
          </div>
        ) : (
          <p className="rounded-card bg-radar-plum p-5 text-base text-lavender-text md:p-6 md:text-lg">
            <span className="font-extrabold text-white">No dates on the radar yet.</span> New shows at this venue will appear here as soon as they are announced.
          </p>
        )}
      </section>

      {v.past.length > 0 && (
        <section aria-labelledby="past-title" className={`${container} flex flex-col gap-4 pb-10 md:pb-14`}>
          <h2 id="past-title" className={h2}>
            Past shows
          </h2>
          <ul className="flex flex-col divide-y divide-plum-line rounded-card bg-radar-plum px-5">
            {v.past.map((p) => (
              <li key={p.slug}>
                <Link href={`/shows/${p.slug}`} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:text-spotlight-yellow">
                  <span className="font-extrabold">{p.title}</span>
                  <span className="text-small text-lavender-text">{formatShowDate(new Date(p.starts_at))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
