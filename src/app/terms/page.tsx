import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using Comedy Radar: we list comedy shows and do not sell tickets, how accounts work, and how to ask for a correction or removal.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "26 November 2026";
const EMAIL = "comedyradarnetwork@gmail.com";

const SECTIONS = [
  { id: "what-we-do", title: "What Comedy Radar does" },
  { id: "tickets", title: "Tickets come from official sellers" },
  { id: "accuracy", title: "Accuracy of listings" },
  { id: "accounts", title: "Accounts and roles" },
  { id: "creators", title: "What creators publish" },
  { id: "public-accounts", title: "Information from public accounts" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "suspension", title: "Suspension and removal" },
  { id: "liability", title: "Liability" },
  { id: "law", title: "Law" },
  { id: "contact", title: "Contact and changes" },
];

const link = "font-bold text-spotlight-yellow underline hover:text-white";

/**
 * Terms of use (spec 7.5, item 4): "On this page" menu, numbered sections,
 * "Last updated" and a draft label. The text must be reviewed by a lawyer before launch.
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-[18px] pb-16 md:px-8">
        <nav
          aria-label="Breadcrumb"
          className="pt-1 pb-3 text-small text-lavender-text md:pt-2 md:pb-4"
        >
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span>{" "}
          <span className="font-bold text-white">Terms</span>
        </nav>
        <header className="flex flex-col gap-3 pb-8 md:pb-10">
          <span className="w-fit rounded-md bg-laugh-pink px-2.5 py-1 text-label font-extrabold tracking-wider text-white uppercase">
            Draft — review before launch
          </span>
          <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
            Terms of use
          </h1>
          <p className="text-small text-lavender-text md:text-base">
            Last updated {LAST_UPDATED}
          </p>
        </header>

        <div className="flex flex-col gap-8 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-12">
          <nav
            aria-labelledby="toc-title"
            className="md:sticky md:top-6 md:self-start"
          >
            <h2
              id="toc-title"
              className="pb-2.5 text-label font-extrabold tracking-wider text-lavender-text uppercase"
            >
              On this page
            </h2>
            <ol className="flex flex-col gap-2 rounded-card bg-radar-plum p-4 text-[15px]">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:text-spotlight-yellow">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex max-w-[720px] flex-col gap-10 text-base leading-relaxed text-lavender">
            <p>
              By using Comedy Radar you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the site.
            </p>

            <Section n={1}>
              <p>
                Comedy Radar is a listings website for live stand-up comedy:
                shows in Egypt, Egyptian comedians on tour and comedians
                visiting Egypt. We list shows, comedians and groups so you can
                find them.{" "}
                <strong className="text-white">We do not sell tickets</strong>{" "}
                and we are not the organiser of any show.
              </p>
            </Section>

            <Section n={2}>
              <p>
                &quot;Get tickets&quot; takes you to the official seller chosen
                by the comedian, the group, the venue or the organiser. Your
                purchase is between you and that seller, under their terms.
                Prices, refunds, changes and cancellations are handled by the
                seller and the organiser, not by Comedy Radar.
              </p>
            </Section>

            <Section n={3}>
              <p>
                We work to keep listings correct, but dates, times, venues,
                line-ups and prices can change. Always check the details with
                the ticket seller or the organiser before you go. If you see
                something wrong,{" "}
                <Link href="/contact?topic=wrong_detail" className={link}>
                  tell us
                </Link>{" "}
                and we will fix it.
              </p>
            </Section>

            <Section n={4}>
              <p>
                Comedians, managers and their teams can create a free account.
                You must give correct information, keep your password safe and
                not share your account. Passwords are handled by our sign-in
                provider; we never see them.
              </p>
              <p>
                An account gets access to a comedian or group page only with a
                role on that page: <strong className="text-white">Admin</strong>{" "}
                (can edit the page, add shows and manage the team) or{" "}
                <strong className="text-white">Moderator</strong> (can add and
                edit shows). You are responsible for what people you invite do
                with the role you give them.
              </p>
              <p>
                You may claim a page only if it is yours or you manage it for
                the comedian or group. We check every claim and may ask for
                proof.
              </p>
            </Section>

            <Section n={5}>
              <p>
                When you publish a show, photo, bio or link, you confirm that it
                is correct and that you have the right to share it. You keep
                ownership of what you publish, and you allow Comedy Radar to
                show it on the site, in the newsletter and on our social
                accounts to promote the show.
              </p>
              <p>
                New profiles and shows from profiles that are not verified are
                checked by Comedy Radar before they go public. We may edit,
                unpublish or remove anything that breaks these terms or that we
                believe is wrong.
              </p>
            </Section>

            <Section n={6}>
              <p>
                Some show details and profiles are gathered from
                comedians&apos;, groups&apos; and venues&apos; public accounts,
                mainly on Instagram. Each show keeps a link to where it came
                from. Pages created this way are marked as added by Comedy Radar
                until they are claimed.
              </p>
              <p>
                If this is your page and you want something changed or removed,
                including a photo,{" "}
                <Link href="/contact?topic=update_or_remove" className={link}>
                  send us a message
                </Link>{" "}
                and we will act on it.
              </p>
            </Section>

            <Section n={7}>
              <p>You agree not to:</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-6">
                <li>
                  publish false, misleading or other people&apos;s shows or
                  pages;
                </li>
                <li>
                  publish content that is unlawful, hateful, harassing or that
                  you have no right to share;
                </li>
                <li>
                  add ticket links that are not the official seller, or that try
                  to trick people;
                </li>
                <li>
                  copy the site&apos;s listings in bulk, or try to break,
                  overload or get around its security;
                </li>
                <li>
                  use someone else&apos;s account or pretend to be someone else.
                </li>
              </ul>
            </Section>

            <Section n={8}>
              <p>
                We may suspend or close an account, or remove content, if these
                terms are broken or to protect fans, comedians or the site. A
                suspended account can no longer change anything; its public
                pages may stay as they are or be unpublished. If you think we
                made a mistake,{" "}
                <a href={`mailto:${EMAIL}`} className={link}>
                  email us
                </a>
                .
              </p>
            </Section>

            <Section n={9}>
              <p>
                Comedy Radar is provided as it is. We are not responsible for
                shows themselves, for tickets bought from sellers, or for
                changes and cancellations made by organisers. As far as the law
                allows, we are not liable for losses that come from using the
                site or from relying on a listing.
              </p>
            </Section>

            <Section n={10}>
              <p>
                These terms are governed by the laws of the Arab Republic of
                Egypt.
              </p>
            </Section>

            <Section n={11}>
              <p>
                Questions about these terms? Email{" "}
                <a href={`mailto:${EMAIL}`} className={link}>
                  {EMAIL}
                </a>{" "}
                or message us on Instagram{" "}
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener"
                  className={link}
                >
                  {INSTAGRAM_HANDLE}
                </a>
                . If we change these terms, we will update the date at the top
                of this page. See also our{" "}
                <Link href="/privacy" className={link}>
                  privacy policy
                </Link>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ n, children }: { n: number; children: React.ReactNode }) {
  const s = SECTIONS[n - 1];
  return (
    <section
      id={s.id}
      aria-labelledby={`${s.id}-title`}
      className="flex scroll-mt-6 flex-col gap-3"
    >
      <h2
        id={`${s.id}-title`}
        className="text-[22px] font-extrabold text-white md:text-2xl"
      >
        {n}. {s.title}
      </h2>
      {children}
    </section>
  );
}
