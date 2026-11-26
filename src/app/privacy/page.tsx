import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/analytics/cookie-settings-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { analyticsEnabled } from "@/lib/analytics-events";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Comedy Radar collects, uses and protects information, and how cookies and analytics work.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "26 November 2026";
const EMAIL = "comedyradarnetwork@gmail.com";

const SECTIONS = [
  { id: "who-we-are", title: "Who we are" },
  { id: "what-we-collect", title: "What we collect" },
  { id: "public-information", title: "Public information about comedians" },
  { id: "how-we-use-it", title: "How we use information" },
  { id: "sharing", title: "Who we share it with" },
  { id: "cookies", title: "Cookies and analytics" },
  { id: "retention", title: "How long we keep it" },
  { id: "your-choices", title: "Your choices" },
  { id: "changes", title: "Changes to this policy" },
];

const link = "font-bold text-spotlight-yellow underline hover:text-white";

/**
 * Privacy policy (spec 7.5, item 4): "On this page" menu, numbered sections,
 * "Last updated" and a draft label. The text must be reviewed by a lawyer before launch.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-[18px] pb-16 md:px-8">
        <nav aria-label="Breadcrumb" className="pt-1 pb-3 text-small text-lavender-text md:pt-2 md:pb-4">
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span> <span className="font-bold text-white">Privacy</span>
        </nav>
        <header className="flex flex-col gap-3 pb-8 md:pb-10">
          <span className="w-fit rounded-md bg-laugh-pink px-2.5 py-1 text-label font-extrabold tracking-wider text-white uppercase">
            Draft — review before launch
          </span>
          <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
            Privacy policy
          </h1>
          <p className="text-small text-lavender-text md:text-base">Last updated {LAST_UPDATED}</p>
        </header>

        <div className="flex flex-col gap-8 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-12">
          <nav aria-labelledby="toc-title" className="md:sticky md:top-6 md:self-start">
            <h2 id="toc-title" className="pb-2.5 text-label font-extrabold tracking-wider text-lavender-text uppercase">
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
            <Section n={1}>
              <p>
                Comedy Radar lists live stand-up comedy in Egypt: local shows, Egyptian comedians on tour and visiting
                comedians. You can reach us at{" "}
                <a href={`mailto:${EMAIL}`} className={link}>
                  {EMAIL}
                </a>{" "}
                or on Instagram{" "}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className={link}>
                  {INSTAGRAM_HANDLE}
                </a>
                .
              </p>
            </Section>

            <Section n={2}>
              <p>
                <strong className="text-white">Visitors.</strong> You can browse without an account. If you join the
                newsletter, we keep your email address. If you accept cookies, Google Analytics collects how the site is
                used (see section 6).
              </p>
              <p>
                <strong className="text-white">Accounts.</strong> Comedians, managers and venues who sign up give us an
                email address and a password. Passwords are handled by our sign-in provider and stored only as a secure
                hash: we never see them.
              </p>
              <p>
                <strong className="text-white">Claiming a profile.</strong> To claim a comedian or group page, you may
                send us proof that the page is yours. We use it only to check the claim.
              </p>
            </Section>

            <Section n={3}>
              <p>
                Show details come from comedians&apos; and venues&apos; public accounts and from creators on Comedy
                Radar. Comedian and group pages show public information such as names, photos, shows and podcasts. If
                this is your page and you want something changed or removed, email us and we will act on it.
              </p>
            </Section>

            <Section n={4}>
              <p>
                We use information to run the site, show listings, send the newsletter you asked for, manage accounts,
                answer messages and understand how the site is used so we can improve it. We do not sell personal
                information and we do not show ads.
              </p>
            </Section>

            <Section n={5}>
              <p>
                We use a few service providers: <strong className="text-white">Vercel</strong> (hosting),{" "}
                <strong className="text-white">Supabase</strong> (database, accounts and file storage) and, if you
                accept cookies, <strong className="text-white">Google Analytics</strong> (visit statistics). Tickets are
                sold by the official ticket sellers: when you press &quot;Get tickets&quot; you leave Comedy Radar, and
                that seller&apos;s own privacy policy applies.
              </p>
            </Section>

            <Section n={6}>
              <p>
                We use <strong className="text-white">Google Analytics 4</strong> to count visits and see which pages,
                shows and links people use (for example &quot;Get tickets&quot;, Spotlight slides, podcast links and
                newsletter sign-ups). This helps us decide what to improve.
              </p>
              <p>
                <strong className="text-white">Nothing is stored until you choose.</strong> When you first visit, a
                banner asks you to accept or reject analytics cookies. Until you accept, Google Analytics cookies are
                not set; Google may receive basic signals without cookies (such as that a page was opened), which it
                uses only in summary form.
              </p>
              <p>
                <strong className="text-white">If you accept,</strong> Google Analytics sets cookies named{" "}
                <code className="text-white">_ga</code> and <code className="text-white">_ga_…</code>, which last up
                to 2 years, so repeat visits can be counted. Google may process this data outside Egypt. We do not use
                advertising cookies, and the advertising options in Google&apos;s consent settings always stay off.
              </p>
              <p>
                <strong className="text-white">Your choice</strong> is saved in your browser (local storage) so we
                don&apos;t ask on every page. You can change it at any time
                {analyticsEnabled ? (
                  <>
                    {" "}
                    with{" "}
                    <CookieSettingsButton className="font-bold text-spotlight-yellow underline hover:text-white" /> (also
                    in the footer). If you reject, we remove the Google Analytics cookies.
                  </>
                ) : (
                  <> with the &quot;Cookie settings&quot; link in the footer.</>
                )}
              </p>
              <p>
                Signing in uses cookies that are needed for your account to work; these are not used for analytics.
              </p>
            </Section>

            <Section n={7}>
              <p>
                We keep account information while your account is open, newsletter emails until you unsubscribe, and
                claim proof only as long as we need it to check the claim. Google Analytics data is kept for the period
                set in our Google Analytics account.
              </p>
            </Section>

            <Section n={8}>
              <p>
                You can unsubscribe from the newsletter at any time, change your cookie choice, and ask us to see,
                correct or delete your information by emailing{" "}
                <a href={`mailto:${EMAIL}`} className={link}>
                  {EMAIL}
                </a>
                .
              </p>
            </Section>

            <Section n={9}>
              <p>
                If we change this policy, we will update the date at the top of this page. Big changes will also be
                shown on the site.
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
    <section id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-6 flex-col gap-3">
      <h2 id={`${s.id}-title`} className="text-[22px] font-extrabold text-white md:text-2xl">
        {n}. {s.title}
      </h2>
      {children}
    </section>
  );
}
