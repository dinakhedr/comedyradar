import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FAQ } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about finding comedy shows in Egypt, tickets, listing your shows, claiming your profile and asking for corrections.",
  alternates: { canonical: "/faq" },
};

/** Questions as structured data for search engines (links shown as their label). */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a.join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
    },
  })),
};

/** FAQ (spec 7.5 item 2). */
export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-[18px] pb-16 md:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <nav
          aria-label="Breadcrumb"
          className="pt-1 pb-3 text-small text-lavender-text md:pt-2 md:pb-4"
        >
          <Link href="/" className="hover:text-white">
            Home
          </Link>{" "}
          <span aria-hidden="true">›</span>{" "}
          <span className="font-bold text-white">FAQ</span>
        </nav>
        <div className="mx-auto flex max-w-[820px] flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
              Questions?{" "}
              <span className="text-spotlight-yellow">
                We&apos;ve got answers
              </span>
            </h1>
            <p className="text-base text-lavender-text md:text-lg">
              How Comedy Radar works for fans, comedians and managers.
            </p>
          </header>

          <FaqList />

          <section
            aria-labelledby="still"
            className="flex flex-col gap-2.5 rounded-[18px] bg-plum-deep p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-card md:px-9 md:py-8"
          >
            <div className="flex flex-col gap-1.5">
              <h2
                id="still"
                className="font-display text-[22px] md:text-[32px]"
              >
                STILL HAVE A QUESTION?
              </h2>
              <p className="text-sm text-lavender-text md:text-base">
                Send us a message and we&apos;ll get back to you.
              </p>
            </div>
            <Link
              href="/contact"
              className="flex min-h-12 shrink-0 items-center justify-center rounded-button bg-spotlight-yellow px-7 text-[15px] font-extrabold text-radar-purple hover:bg-white md:text-base"
            >
              Contact us
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
