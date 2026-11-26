import Link from "next/link";
import { analyticsEnabled } from "@/lib/analytics-events";
import { CookieSettingsButton } from "./analytics/cookie-settings-button";
import { InstagramIcon, MailIcon } from "./icons";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/shows", label: "Shows" },
      { href: "/tours", label: "Tours" },
      { href: "/comedians", label: "Comedians" },
      { href: "/groups", label: "Groups" },
      { href: "/venues", label: "Venues" },
    ],
  },
  {
    title: "For comedians",
    links: [
      { href: "/for-comedians", label: "List your shows" },
      { href: "/dashboard/profiles/new", label: "Claim your profile" },
      { href: "/signin", label: "Sign in" },
    ],
  },
  {
    title: "Comedy Radar",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-8 px-[18px] pt-11 pb-14 md:px-8">
        <div className="flex max-w-[320px] flex-col gap-3.5">
          <Logo className="w-[150px]" />
          <p className="text-small leading-relaxed text-lavender-text">
            If it&apos;s live and it&apos;s funny, it&apos;s on the radar.
          </p>
          <a
            href="https://instagram.com/comedy_radar"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 text-[15px] font-extrabold hover:text-spotlight-yellow"
          >
            <InstagramIcon className="text-spotlight-yellow" />
            @comedy_radar
          </a>
          <a
            href="mailto:comedyradarnetwork@gmail.com"
            className="inline-flex items-center gap-2 text-small text-lavender-text hover:text-white"
          >
            <MailIcon size={18} className="text-spotlight-yellow" />
            comedyradarnetwork@gmail.com
          </a>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-14 gap-y-8">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-2.5">
              <h2 className="text-label font-extrabold tracking-wider text-lavender-text uppercase">{col.title}</h2>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-[15px] hover:text-spotlight-yellow">
                  {l.label}
                </Link>
              ))}
              {col.title === "Comedy Radar" && analyticsEnabled && (
                <CookieSettingsButton className="text-left text-[15px] hover:text-spotlight-yellow" />
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-radar-plum">
        <p className="mx-auto max-w-[1280px] px-[18px] py-[18px] text-label text-lavender-text md:px-8">
          © Comedy Radar · Show details come from comedians&apos; and venues&apos; public accounts and from creators on
          Comedy Radar. Tickets are sold by the official sellers.
        </p>
      </div>
    </footer>
  );
}
