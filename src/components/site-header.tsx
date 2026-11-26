import Link from "next/link";
import { Suspense } from "react";
import { getCities } from "@/lib/data/home";
import { countriesOf } from "@/lib/countries";
import { CountrySelect } from "./country-select";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NAV_LINKS } from "./nav-links";

export async function SiteHeader() {
  const cities = await getCities();
  return (
    <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-[18px] py-3.5 md:px-8 md:py-5">
      <Logo />
      <nav aria-label="Main" className="hidden flex-wrap gap-7 md:flex">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-base font-bold hover:text-spotlight-yellow">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        <Suspense fallback={<div className="h-11 w-32 rounded-button border-2 border-plum-line" />}>
          <CountrySelect countries={countriesOf(cities)} id="header-country" />
        </Suspense>
        <Link
          href="/signin"
          className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-[18px] text-[15px] font-extrabold text-radar-purple hover:bg-white"
        >
          Sign in
        </Link>
      </div>
      <MobileMenu />
    </header>
  );
}
