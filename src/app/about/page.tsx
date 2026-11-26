import type { Metadata } from "next";
import Link from "next/link";
import { InstagramIcon, MailIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Comedy Radar puts every live stand-up show in Egypt in one place: local shows, Egyptian comedians on tour and visiting comedians.",
  alternates: { canonical: "/about" },
};

const EMAIL = "comedyradarnetwork@gmail.com";
const container = "mx-auto w-full max-w-[1280px] px-[18px] md:px-8";
const yellowBtn =
  "flex min-h-12 items-center justify-center rounded-button bg-spotlight-yellow px-7 text-[15px] font-extrabold text-radar-purple hover:bg-white md:text-base";
const outlineBtn =
  "flex min-h-12 items-center justify-center rounded-button border-2 border-spotlight-yellow px-7 text-[15px] font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple md:text-base";
const h2 = "font-display text-[28px] leading-none md:text-display-md";

const RANGES = [
  {
    name: "Local Range",
    text: "Every stand-up show in Egypt.",
    example: "A Thursday night show in Cairo or Alexandria.",
  },
  {
    name: "Outbound Range",
    text: "Egyptian comedians performing abroad.",
    example: "An Egyptian comedian on stage in Dubai or London.",
  },
  {
    name: "Inbound Range",
    text: "International and Arab comedians performing in Egypt.",
    example: "A visiting comedian's night in Cairo.",
  },
];

const STEPS = [
  {
    title: "We gather the shows",
    text: "From comedians', groups' and venues' public accounts, and from creators who list their own shows here.",
  },
  {
    title: "We check and organise them",
    text: "By date, city, comedian and group, with a link to where each show came from.",
  },
  {
    title: "You get tickets at the source",
    text: 'We don\'t sell tickets. "Get tickets" takes you to the official seller. Prices are on the show page only.',
  },
];

/** About (spec 7.5 item 1). */
export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col gap-12 pb-16 md:gap-20">
        <section className={`${container} flex flex-col gap-5`}>
          <nav
            aria-label="Breadcrumb"
            className="pt-1 text-small text-lavender-text md:pt-2"
          >
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            <span aria-hidden="true">›</span>{" "}
            <span className="font-bold text-white">About</span>
          </nav>
          <h1 className="max-w-[900px] font-display text-[44px] leading-none md:text-display-xl">
            Every laugh{" "}
            <span className="text-spotlight-yellow">on the radar</span>
          </h1>
          <p className="max-w-[720px] text-base leading-relaxed text-lavender md:text-lg">
            Stand-up comedy in Egypt is everywhere: small rooms, big theatres,
            open mics and tours. But the shows are scattered across dozens of
            Instagram accounts. Comedy Radar puts them in one place, so you can
            find what&apos;s on this month, follow the comedians you love and go
            straight to the official tickets. If it&apos;s live and it&apos;s
            funny, it&apos;s on the radar.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/shows" className={yellowBtn}>
              This month&apos;s shows
            </Link>
            <Link href="/for-comedians" className={outlineBtn}>
              List your shows
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="cover"
          className={`${container} flex flex-col gap-5`}
        >
          <h2 id="cover" className={h2}>
            What we cover
          </h2>
          <ul className="grid gap-3.5 md:grid-cols-3 md:gap-5">
            {RANGES.map((r) => (
              <li
                key={r.name}
                className="flex flex-col gap-2 rounded-card bg-radar-plum p-5 md:p-6"
              >
                <h3 className="font-display text-[24px] leading-none text-spotlight-yellow">
                  {r.name}
                </h3>
                <p className="text-base font-bold">{r.text}</p>
                <p className="text-sm text-lavender-text">
                  For example: {r.example}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="how"
          className={`${container} flex flex-col gap-5`}
        >
          <h2 id="how" className={h2}>
            How it works
          </h2>
          <ol className="grid gap-3.5 md:grid-cols-3 md:gap-5">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-4 rounded-card border-2 border-plum-line p-5 md:flex-col md:p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-laugh-pink font-display text-[22px] text-white"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[19px] font-extrabold">{s.title}</h3>
                  <p className="text-[15px] leading-relaxed text-lavender-text">
                    {s.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="yours" className={container}>
          <div className="flex flex-col gap-4 rounded-[18px] bg-spotlight-yellow p-[18px] text-radar-purple md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-card md:px-9 md:py-8">
            <div className="flex flex-col gap-1.5">
              <h2
                id="yours"
                className="font-display text-[26px] leading-none md:text-[36px]"
              >
                Your shows, your page
              </h2>
              <p className="text-[15px] md:text-base">
                Comedians, groups and managers get their own page and list their
                shows for free.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
              <Link
                href="/for-comedians"
                className="flex min-h-12 items-center justify-center rounded-button bg-radar-purple px-6 text-[15px] font-extrabold text-white hover:bg-radar-plum md:text-base"
              >
                List your shows free
              </Link>
              <Link
                href="/dashboard/profiles/new"
                className="flex min-h-12 items-center justify-center rounded-button border-2 border-radar-purple px-6 text-[15px] font-extrabold hover:bg-white md:text-base"
              >
                Claim your profile
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-label="Get in touch"
          className={`${container} grid gap-3.5 md:grid-cols-2 md:gap-5`}
        >
          <div className="flex flex-col items-start gap-3 rounded-card bg-radar-plum p-5 md:p-7">
            <h2 className="text-heading font-extrabold">
              Something wrong or missing?
            </h2>
            <p className="text-[15px] leading-relaxed text-lavender-text">
              A wrong date, a cancelled show, or a show we haven&apos;t found
              yet? Tell us and we&apos;ll fix it.
            </p>
            <Link href="/contact?topic=wrong_detail" className={outlineBtn}>
              Report a correction
            </Link>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-card bg-radar-plum p-5 md:p-7">
            <h2 className="text-heading font-extrabold">Say hello</h2>
            <p className="text-[15px] leading-relaxed text-lavender-text">
              Questions, ideas or partnerships: we&apos;d love to hear from you.
            </p>
            <ul className="flex flex-col gap-2.5 text-[15px] font-bold">
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="inline-flex min-h-11 items-center gap-2.5 break-all hover:text-spotlight-yellow"
                >
                  <MailIcon className="shrink-0 text-spotlight-yellow" />
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-11 items-center gap-2.5 hover:text-spotlight-yellow"
                >
                  <InstagramIcon className="shrink-0 text-spotlight-yellow" />
                  {INSTAGRAM_HANDLE}
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
