import Link from "next/link";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";

const BENEFITS = [
  { title: "Your own page", text: "A comedian or group page with your bio, photos, links and every upcoming show." },
  { title: "On the homepage and listings", text: "Your shows appear on This month, the city pages, tours and search." },
  { title: "Manage a whole group", text: "One account for a group and each member, with a team you choose." },
  { title: "See what works", text: "Page views and ticket clicks for every show, in your dashboard." },
];

/** Split screen for sign up / sign in (spec 11.4 item 1). */
export function AuthShell({
  tab,
  next,
  children,
}: {
  tab: "signup" | "signin" | null;
  next?: string;
  children: React.ReactNode;
}) {
  const q = next && next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : "";
  const tabCls = "flex min-h-11 flex-1 items-center justify-center rounded-[10px] text-[15px] font-extrabold";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-[1280px] gap-8 px-[18px] pt-2 pb-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12 md:px-8 md:pt-6 md:pb-16">
        <section className="flex flex-col gap-5 md:pt-6" aria-labelledby="auth-pitch">
          <h1 id="auth-pitch" className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px]">
            LIST YOUR SHOWS <span className="text-spotlight-yellow">FREE</span>
          </h1>
          <p className="text-base text-lavender-text md:text-lg">
            Comedians, groups and managers add their shows and tours to Comedy Radar, and fans find them.
          </p>
          <ul className="hidden flex-col gap-3 md:flex">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3 rounded-card bg-radar-plum p-4">
                <span aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-spotlight-yellow text-center font-extrabold text-radar-purple">
                  ✓
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-extrabold">{b.title}</span>
                  <span className="text-sm text-lavender-text">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-5 rounded-[22px] bg-white p-5 text-radar-purple md:rounded-[28px] md:p-8" aria-label="Account">
          {tab && (
            <nav aria-label="Sign up or sign in" className="flex gap-1 rounded-button bg-lavender p-1">
              <Link href={`/signup${q}`} aria-current={tab === "signup" ? "page" : undefined} className={`${tabCls} ${tab === "signup" ? "bg-radar-purple text-spotlight-yellow" : "text-radar-purple hover:bg-white"}`}>
                Sign up
              </Link>
              <Link href={`/signin${q}`} aria-current={tab === "signin" ? "page" : undefined} className={`${tabCls} ${tab === "signin" ? "bg-radar-purple text-spotlight-yellow" : "text-radar-purple hover:bg-white"}`}>
                Sign in
              </Link>
            </nav>
          )}
          {children}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
