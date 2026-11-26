import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo-mark";
import { Logo } from "@/components/logo";

export const metadata = { title: "Page not found" };

/** 404 (spec 7.6). Pages that are not built yet also land here for now. */
export default function NotFound() {
  return (
    <>
      <header className="mx-auto flex max-w-[1280px] items-center px-[18px] py-3.5 md:px-8 md:py-5">
        <Logo />
      </header>
      <main className="mx-auto flex max-w-[720px] flex-col items-center gap-5 px-[18px] py-16 text-center">
        <LogoMark size={120} />
        <p className="text-label font-extrabold tracking-widest text-laugh-pink">ERROR 404</p>
        <h1 className="font-display text-[40px] leading-none md:text-display-xl">
          We lost the <span className="text-spotlight-yellow">signal</span>
        </h1>
        <p className="text-base text-lavender-text md:text-lg">
          This page is not on the radar (yet). Try a search, or head to this month&apos;s shows.
        </p>
        <form action="/search" role="search" className="flex w-full gap-2 rounded-2xl bg-white p-1.5">
          <label htmlFor="nf-search" className="sr-only">
            Search
          </label>
          <input
            id="nf-search"
            name="q"
            type="search"
            placeholder="Search a comedian, group, show or venue"
            className="min-w-0 flex-1 rounded-button px-4 py-3 text-base text-radar-purple placeholder:text-radar-purple/60"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-12 w-12 items-center justify-center rounded-button bg-radar-purple text-spotlight-yellow"
          >
            <SearchIcon />
          </button>
        </form>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple hover:bg-white"
          >
            This month&apos;s shows
          </Link>
          {[
            ["/tours", "Tours"],
            ["/comedians", "Comedians"],
            ["/groups", "Groups"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-button border-2 border-plum-line px-5 font-bold hover:border-spotlight-yellow"
            >
              {label}
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
