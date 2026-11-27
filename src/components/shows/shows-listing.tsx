import Link from "next/link";
import { SearchIcon } from "../icons";
import { Pagination } from "../pagination";
import { ShowCard } from "../show-card";
import { getCities } from "@/lib/data/home";
import { countUpcomingShows, getPerformerOptions, getShowsPage, type PerformerOption } from "@/lib/data/shows";
import type { City, ShowRow } from "@/lib/data/types";
import { cardBadge, type BadgeInfo } from "@/lib/show-display";
import {
  activeChips,
  countMoreFilters,
  datesLabel,
  LANGUAGE_OPTIONS,
  parseShowsFilters,
  SHOWS_PER_PAGE,
  showingLine,
  showsHref,
  SORT_OPTIONS,
  TYPE_OPTIONS,
  WHEN_OPTIONS,
  whenLabel,
  ZONE_OPTIONS,
  type ShowsFilters,
} from "@/lib/shows-filters";
import { FilterSheet, NavCheckbox, NavSelect, type NavOption } from "./nav-controls";

type SP = Promise<Record<string, string | string[] | undefined>>;

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm md:px-[18px] md:text-[15px]";
const chipOn = "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple";
const chipOff = "border-plum-line font-bold text-white hover:border-spotlight-yellow";
const rowLabel = "w-16 shrink-0 text-[13px] font-extrabold tracking-[1px] text-lavender-text";

/** The badge on an All shows card: the Coming up badge, or ON TOUR for shows abroad. */
function listBadge(show: ShowRow): BadgeInfo | null {
  return cardBadge(show) ?? (show.zone === "outbound" ? { label: "On tour", tone: "purple", icon: "tour" } : null);
}

/** Hidden inputs that keep the other filters when a plain form (search, dates) is sent. */
function HiddenFields({ href, skip }: { href: string; skip: string[] }) {
  const params = new URLSearchParams(href.split("?")[1] ?? "");
  return [...params.entries()]
    .filter(([k]) => !skip.includes(k))
    .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
}

type Ctx = { f: ShowsFilters; base: string; cities: City[]; performers: PerformerOption[]; lockedCity: boolean };

const href = (c: Ctx, change: Partial<ShowsFilters> = {}) => showsHref(c.f, change, c.base);

function WhenChips({ c }: { c: Ctx }) {
  return WHEN_OPTIONS.map((w) => (
    <Link
      key={w.value}
      href={href(c, { when: w.value, from: null, to: null })}
      scroll={false}
      aria-current={c.f.when === w.value ? "true" : undefined}
      className={`${chip} ${c.f.when === w.value ? chipOn : chipOff}`}
    >
      {w.label}
    </Link>
  ));
}

function PickDates({ c, idPrefix }: { c: Ctx; idPrefix: string }) {
  const active = c.f.when === "dates";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  return (
    <details className="group relative">
      <summary
        className={`${chip} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${
          active ? chipOn : "border-dashed border-plum-line font-bold text-white hover:border-spotlight-yellow"
        }`}
      >
        {active ? datesLabel(c.f.from, c.f.to) : "Pick dates"}
      </summary>
      <form
        action={c.base}
        className="z-20 mt-2 flex flex-col gap-3 rounded-card border-2 border-plum-line bg-radar-purple p-4 md:absolute md:top-full md:left-0 md:w-[300px]"
      >
        <HiddenFields href={href(c, { when: "dates" })} skip={["from", "to", "when", "page"]} />
        <input type="hidden" name="when" value="dates" />
        <div className="grid grid-cols-2 gap-2">
          {(["from", "to"] as const).map((k) => (
            <label key={k} htmlFor={`${idPrefix}-${k}`} className="flex flex-col gap-1 text-[13px] font-bold text-lavender-text">
              {k === "from" ? "From" : "To"}
              <input
                id={`${idPrefix}-${k}`}
                type="date"
                name={k}
                min={today}
                defaultValue={c.f[k] ?? ""}
                className="min-h-11 rounded-[10px] bg-white px-2 text-[15px] font-bold text-radar-purple"
              />
            </label>
          ))}
        </div>
        <button type="submit" className="min-h-11 rounded-button bg-spotlight-yellow font-extrabold text-radar-purple hover:bg-white">
          Show these dates
        </button>
      </form>
    </details>
  );
}

function ZoneChips({ c }: { c: Ctx }) {
  return ZONE_OPTIONS.map((z) => (
    <Link
      key={z.value}
      href={href(c, { zone: z.value })}
      scroll={false}
      aria-current={c.f.zone === z.value ? "true" : undefined}
      className={`${chip} ${c.f.zone === z.value ? chipOn : chipOff}`}
    >
      {z.label}
    </Link>
  ));
}

function CityControl({ c, id }: { c: Ctx; id: string }) {
  if (c.lockedCity) {
    const name = c.cities.find((x) => x.slug === c.f.city)?.name ?? c.f.city;
    return (
      <Link href={showsHref({ ...c.f, city: null }, {}, "/shows")} className={`${chip} ${chipOn}`}>
        City: {name} <span aria-hidden="true" className="ml-2">×</span>
        <span className="sr-only">(show all cities)</span>
      </Link>
    );
  }
  const options: NavOption[] = [
    { value: "", label: "All cities", href: href(c, { city: null }) },
    ...c.cities.map((city) => ({
      value: city.slug,
      label: city.name,
      href: href(c, { city: city.slug }),
      group: city.country_name,
    })),
  ];
  return <NavSelect id={id} label="City" value={c.f.city ?? ""} options={options} className="md:w-auto" />;
}

function MoreControls({ c, idPrefix }: { c: Ctx; idPrefix: string }) {
  const performerValue = c.f.comedian ? `comedian:${c.f.comedian}` : c.f.group ? `group:${c.f.group}` : "";
  const performerOptions: NavOption[] = [
    { value: "", label: "Performer: All", href: href(c, { comedian: null, group: null }) },
    ...c.performers.map((p) => ({
      value: `${p.kind}:${p.slug}`,
      label: p.name,
      group: p.kind === "group" ? "Groups" : "Comedians",
      href: href(c, p.kind === "group" ? { group: p.slug, comedian: null } : { comedian: p.slug, group: null }),
    })),
  ];
  // Keep a performer from the address visible even if they have no upcoming shows.
  if (performerValue && !performerOptions.some((o) => o.value === performerValue)) {
    performerOptions.push({ value: performerValue, label: (c.f.comedian ?? c.f.group)!, href: href(c) });
  }
  return (
    <>
      <NavSelect id={`${idPrefix}-performer`} label="Performer" value={performerValue} options={performerOptions} className="md:w-auto" />
      <NavSelect
        id={`${idPrefix}-type`}
        label="Comedians or groups"
        value={c.f.type}
        options={TYPE_OPTIONS.map((t) => ({
          value: t.value,
          label: t.value === "all" ? "Comedians or groups" : t.label,
          href: href(c, { type: t.value }),
        }))}
        className="md:w-auto"
      />
      <NavSelect
        id={`${idPrefix}-lang`}
        label="Language"
        value={c.f.lang ?? ""}
        options={[
          { value: "", label: "Language: Any", href: href(c, { lang: null }) },
          ...LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label, href: href(c, { lang: l.value }) })),
        ]}
        className="md:w-auto"
      />
      <NavCheckbox
        id={`${idPrefix}-soldout`}
        label="Hide sold out"
        checked={c.f.hideSoldOut}
        href={href(c, { hideSoldOut: !c.f.hideSoldOut })}
      />
    </>
  );
}

function clearAllHref(c: Ctx) {
  return c.lockedCity ? c.base : "/shows";
}

function SearchForm({ c }: { c: Ctx }) {
  return (
    <form action={c.base} role="search" className="flex w-full gap-1.5 rounded-[14px] bg-white p-[5px] md:gap-2 md:rounded-2xl md:p-1.5">
      <HiddenFields href={href(c)} skip={["q", "page"]} />
      <label htmlFor="shows-q" className="sr-only">
        Search shows
      </label>
      <input
        id="shows-q"
        name="q"
        type="search"
        defaultValue={c.f.q}
        placeholder="Search a show, comedian, group or venue"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-[10px] px-3 py-3 text-base font-bold text-radar-purple placeholder:font-normal placeholder:text-radar-purple/60 md:px-4 md:py-3.5 md:text-[17px]"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-radar-purple text-spotlight-yellow hover:bg-radar-plum md:h-auto md:w-auto md:rounded-button md:px-7 md:py-3.5 md:text-base md:font-extrabold"
      >
        <SearchIcon className="md:hidden" />
        <span className="hidden md:inline">Search</span>
      </button>
    </form>
  );
}

function SortSelect({ c, id, mobile }: { c: Ctx; id: string; mobile?: boolean }) {
  return (
    <NavSelect
      id={id}
      label={mobile ? "Sort" : "Sort by"}
      srOnlyLabel={mobile}
      value={c.f.sort}
      options={SORT_OPTIONS.map((s) => ({
        value: s.value,
        label: mobile ? `Sort: ${s.short}` : s.label,
        href: href(c, { sort: s.value }),
      }))}
      className={mobile ? "flex-1" : ""}
      selectClassName={mobile ? "bg-radar-plum text-sm text-center" : "bg-radar-plum"}
    />
  );
}

/** All shows (docs/website-spec.md, 7.1), also used by /shows/city/[city] with the city preset. */
export async function ShowsListing({ searchParams, city }: { searchParams: SP; city?: City }) {
  const f = parseShowsFilters(await searchParams, city ? { city: city.slug } : {});
  const base = city ? `/shows/city/${city.slug}` : "/shows";
  const [{ shows, total }, upcoming, cities, performers] = await Promise.all([
    getShowsPage(f),
    countUpcomingShows(),
    getCities(),
    getPerformerOptions(),
  ]);
  const c: Ctx = { f, base, cities, performers, lockedCity: !!city };
  const now = new Date();
  const cityName = cities.find((x) => x.slug === f.city)?.name ?? null;
  const performerName = performers.find((p) => p.slug === (f.comedian ?? f.group))?.name ?? null;
  const chips = activeChips(f, { city: cityName, performer: performerName }).filter((x) => !(city && "city" in x.remove));
  const moreCount = countMoreFilters(f) - (city ? 1 : 0);
  const pages = Math.max(1, Math.ceil(total / SHOWS_PER_PAGE));
  const page = Math.min(f.page, pages);
  const isFiltered = href(c) !== base;

  return (
    <>
      <section className={`${container} flex flex-col gap-3 pb-[18px] md:gap-4 md:pb-7`}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
            {city ? (
              <>
                SHOWS IN <span className="text-spotlight-yellow">{city.name.toUpperCase()}</span>
              </>
            ) : (
              <>
                ALL <span className="text-spotlight-yellow">SHOWS</span>
              </>
            )}
          </h1>
          <p className="text-sm text-lavender-text md:text-[17px]">
            {upcoming} upcoming {upcoming === 1 ? "show" : "shows"} in Egypt and on tour
          </p>
        </div>
        <SearchForm c={c} />
      </section>

      {/* Desktop filter panel */}
      <section aria-label="Filters" className={`${container} hidden pb-6 md:block`}>
        <div className="flex flex-col gap-4 rounded-[20px] bg-radar-plum px-[22px] py-5">
          <div role="group" aria-label="When" className="flex flex-wrap items-center gap-2.5">
            <span className={rowLabel}>WHEN</span>
            <WhenChips c={c} />
            <PickDates c={c} idPrefix="d" />
          </div>
          <div role="group" aria-label="Where" className="flex flex-wrap items-center gap-2.5">
            <span className={rowLabel}>WHERE</span>
            <ZoneChips c={c} />
            <CityControl c={c} id="d-city" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div role="group" aria-label="More filters" className="flex flex-wrap items-center gap-2.5">
              <span className={rowLabel}>MORE</span>
              <MoreControls c={c} idPrefix="d" />
            </div>
            {isFiltered && (
              <Link href={clearAllHref(c)} scroll={false} className="min-h-11 px-1 py-2.5 text-[15px] font-extrabold text-spotlight-yellow underline hover:text-white">
                Clear all
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filters */}
      <section aria-label="Filters" className="flex flex-col gap-2.5 pb-4 md:hidden">
        <div role="group" aria-label="When" className="no-scrollbar flex gap-2 overflow-x-auto px-[18px]">
          <WhenChips c={c} />
        </div>
        <div className="flex gap-2 px-[18px]">
          <FilterSheet count={moreCount + (f.when === "dates" ? 1 : 0)}>
            <div role="group" aria-label="Pick dates" className="flex flex-col gap-2.5">
              <span className={rowLabel}>DATES</span>
              <div>
                <PickDates c={c} idPrefix="m" />
              </div>
            </div>
            <div role="group" aria-label="Where" className="flex flex-col gap-2.5">
              <span className={rowLabel}>WHERE</span>
              <div className="flex flex-wrap gap-2">
                <ZoneChips c={c} />
              </div>
              <CityControl c={c} id="m-city" />
            </div>
            <div role="group" aria-label="More filters" className="flex flex-col gap-2.5">
              <span className={rowLabel}>MORE</span>
              <MoreControls c={c} idPrefix="m" />
            </div>
            {isFiltered && (
              <Link href={clearAllHref(c)} scroll={false} className="self-start py-2 text-[15px] font-extrabold text-spotlight-yellow underline">
                Clear all
              </Link>
            )}
          </FilterSheet>
          <SortSelect c={c} id="m-sort" mobile />
        </div>
        {chips.length > 0 && (
          <ul aria-label="Active filters" className="flex flex-wrap gap-1.5 px-[18px]">
            {chips.map((x) => (
              <li key={x.label} className="flex items-center gap-1.5 rounded-full bg-radar-plum py-1.5 pr-1.5 pl-3 text-[13px] font-bold">
                {x.label}
                <Link
                  href={href(c, x.remove)}
                  scroll={false}
                  aria-label={`Remove ${x.label} filter`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-radar-purple text-sm"
                >
                  ×
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Shows" className={`${container} flex flex-col gap-3 pb-10 md:gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-lavender-text md:text-[15px]" aria-live="polite">
            {showingLine(page, total)}
            <span className="hidden md:inline"> · {whenLabel(f)}</span>
          </p>
          <div className="hidden md:block">
            <SortSelect c={c} id="d-sort" />
          </div>
        </div>
        {shows.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-card bg-radar-plum p-6 md:p-10">
            <p className="font-display text-[22px] md:text-display-md">Nothing on the radar for these filters</p>
            <Link
              href={clearAllHref(c)}
              className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 py-3 font-extrabold text-radar-purple hover:bg-white"
            >
              Clear all
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
            {shows.map((s) => (
              <ShowCard key={s.id} show={s} now={now} badge={listBadge(s)} />
            ))}
          </div>
        )}
        <Pagination page={page} pages={pages} href={(n) => href(c, { page: n })} />
      </section>
    </>
  );
}

export function ShowsListingSkeleton() {
  return (
    <div className={`${container} flex flex-col gap-4 pb-10`} aria-busy="true" aria-label="Loading shows">
      <div className="h-12 w-64 rounded-lg bg-radar-plum md:h-14" />
      <div className="h-14 rounded-2xl bg-white/90" />
      <div className="hidden h-[200px] rounded-[20px] bg-radar-plum md:block" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-radar-plum md:h-[340px] md:rounded-card" />
        ))}
      </div>
    </div>
  );
}

/** The city of a /shows/city/[city] address, or null when there is no such city. */
export async function findCity(slug: string): Promise<City | null> {
  const cities = await getCities();
  return cities.find((c) => c.slug === slug) ?? null;
}
