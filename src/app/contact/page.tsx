import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactForm } from "@/components/contact-form";
import { InstagramIcon, MailIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cleanPageUrl, contactHref, contactTopicOf } from "@/lib/contact";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a wrong show detail, ask to update or remove a profile, get help claiming your page, or just say hello.",
  alternates: { canonical: "/contact" },
};

const EMAIL = "comedyradarnetwork@gmail.com";
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

async function Form({
  searchParams,
}: {
  searchParams: PageProps<"/contact">["searchParams"];
}) {
  const sp = await searchParams;
  return (
    <ContactForm
      topic={contactTopicOf(one(sp.topic))}
      page={cleanPageUrl(one(sp.page)) ?? ""}
    />
  );
}

const QUICK = [
  { href: contactHref("wrong_detail"), label: "Report a show detail" },
  { href: "/dashboard/profiles/new", label: "Claim your profile" },
  { href: "/for-comedians", label: "List your shows" },
  { href: "/faq", label: "Read the FAQ" },
];

/** Contact (spec 7.5 item 3). */
export default function ContactPage({ searchParams }: PageProps<"/contact">) {
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
          <span className="font-bold text-white">Contact</span>
        </nav>
        <header className="flex flex-col gap-3 pb-8">
          <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
            Get in <span className="text-spotlight-yellow">touch</span>
          </h1>
          <p className="max-w-[640px] text-base text-lavender-text md:text-lg">
            Spotted a wrong detail, want your page changed, or have an idea?
            Send us a message and we&apos;ll reply by email.
          </p>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <Suspense
            fallback={
              <div
                className="h-[640px] animate-pulse rounded-card bg-radar-plum"
                aria-busy="true"
              />
            }
          >
            <Form searchParams={searchParams} />
          </Suspense>
          <aside className="flex flex-col gap-4">
            <section
              aria-labelledby="ct-direct"
              className="flex flex-col gap-2.5 rounded-card border-2 border-plum-line p-5"
            >
              <h2 id="ct-direct" className="text-[19px] font-extrabold">
                Write to us directly
              </h2>
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex min-h-11 items-center gap-2.5 font-bold break-all hover:text-spotlight-yellow"
              >
                <MailIcon className="shrink-0 text-spotlight-yellow" />
                {EMAIL}
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-11 items-center gap-2.5 font-bold hover:text-spotlight-yellow"
              >
                <InstagramIcon className="shrink-0 text-spotlight-yellow" />
                {INSTAGRAM_HANDLE}
              </a>
            </section>
            <nav
              aria-labelledby="ct-quick"
              className="flex flex-col gap-1 rounded-card border-2 border-plum-line p-5"
            >
              <h2 id="ct-quick" className="pb-1 text-[19px] font-extrabold">
                Quick links
              </h2>
              {QUICK.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex min-h-11 items-center justify-between gap-2 font-bold hover:text-spotlight-yellow"
                >
                  {q.label}
                  <span aria-hidden="true" className="text-spotlight-yellow">
                    →
                  </span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
