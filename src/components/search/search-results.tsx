import Link from "next/link";
import { getTrackItems } from "@/lib/data/home";
import { searchRadar, type SearchResults as Results } from "@/lib/data/search";
import { isSearchable, normalizeQuery, parseTab, plural, searchHref, TAB_LABELS, type SearchTab } from "@/lib/search";
import { ShowCard } from "../show-card";
import { CoverImage } from "../placeholder-image";
import { BestComedianResult, ComedianResult, GroupResult, TourResult, VenueResult } from "./result-cards";
import { SearchBar } from "./search-bar";

type SP = Promise<Record<string, string | string[] | undefined>>;

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";

/** How many of each type the All tab shows before "See all". */
const ALL_LIMITS = { groups: 3, comedians: 5, shows: 4, tours: 2, venues: 4 };

function counts(r: Results): Record<SearchTab, number> {
  const c = {
    groups: r.groups.length,
    comedians: r.comedians.length,
    shows: r.shows.length,
    tours: r.tours.length,
    venues: r.venues.length,
  };
  return { all: c.groups + c.comedians + c.shows + c.tours + c.venues, ...c };
}

function SectionHead({ title, q, tab, total, shown, note }: {
  title: string;
  q: string;
  tab: SearchTab;
  total: number;
  shown: number;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[22px] md:text-[28px]">{title}</h2>
      {note ? (
        <span className="text-small text-lavender-text">{note}</span>
      ) : (
        total > shown && (
          <Link href={searchHref(q, tab)} className="text-small font-extrabold text-spotlight-yellow hover:text-white md:text-[15px]">
            See all {total}
          </Link>
        )
      )}
    </div>
  );
}

function Tabs({ q, active, n }: { q: string; active: SearchTab; n: Record<SearchTab, number> }) {
  return (
    <div
      role="tablist"
      aria-label="Result types"
      className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto border-b-2 border-radar-plum px-[18px] pb-3.5 md:mx-0 md:flex-wrap md:px-0"
    >
      {(Object.keys(TAB_LABELS) as SearchTab[]).map((tab) => {
        const label = `${TAB_LABELS[tab]} (${n[tab]})`;
        const base = "shrink-0 rounded-full px-[18px] text-[15px] whitespace-nowrap";
        if (tab === active) {
          return (
            <span key={tab} role="tab" aria-selected="true" className={`${base} bg-spotlight-yellow py-2.5 font-extrabold text-radar-purple`}>
              {label}
            </span>
          );
        }
        if (n[tab] === 0) {
          return (
            <span key={tab} role="tab" aria-selected="false" aria-disabled="true" className={`${base} border-2 border-radar-plum py-2 font-bold text-lavender-text/60`}>
              {label}
            </span>
          );
        }
        return (
          <Link
            key={tab}
            href={searchHref(q, tab)}
            role="tab"
            aria-selected="false"
            className={`${base} border-2 border-plum-line py-2 font-bold hover:border-spotlight-yellow`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/** "Not what you were looking for?" band (spec 8). */
export function NotWhatBand() {
  return (
    <section className="bg-plum-deep">
      <div className={`${container} flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between md:py-10`}>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[24px] md:text-[32px]">Not what you were looking for?</h2>
          <p className="text-base text-lavender-text">
            Try another spelling or an Arabic name, or browse everything on the radar.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/shows"
            className="inline-flex min-h-12 items-center rounded-button border-2 border-spotlight-yellow px-5 font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple"
          >
            All shows
          </Link>
          <Link
            href="/dashboard/shows/new"
            className="inline-flex min-h-12 items-center rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple hover:bg-white"
          >
            List your shows
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Suggestions when nothing matched: popular comedians and groups this month. */
async function Suggestions() {
  const items = await getTrackItems(6);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="suggest-title" className={`${container} flex flex-col gap-4 pb-10`}>
      <h2 id="suggest-title" className="font-display text-[22px] md:text-[28px]">
        Popular on the radar this month
      </h2>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-6 md:grid-cols-6 md:gap-6">
        {items.map((item, i) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              href={item.kind === "group" ? `/groups/${item.slug}` : `/comedians/${item.slug}`}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span
                className={`block h-[84px] w-[84px] overflow-hidden rounded-full border-[3px] md:h-24 md:w-24 ${
                  i % 2 === 0 ? "border-spotlight-yellow" : "border-laugh-pink"
                }`}
              >
                <CoverImage src={item.photo_url} alt="" iconSize={40} className="h-full w-full" tone="deep" />
              </span>
              <span className="text-[15px] font-extrabold group-hover:text-spotlight-yellow">{item.name}</span>
              <span className="text-[13px] text-lavender-text">{item.kind === "group" ? "Group" : "Comedian"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultSections({ r, q, tab }: { r: Results; q: string; tab: SearchTab }) {
  const n = counts(r);
  const all = tab === "all";
  const now = new Date();
  const take = <T,>(items: T[], key: keyof typeof ALL_LIMITS) => (all ? items.slice(0, ALL_LIMITS[key]) : items);

  // On the All tab the best match gets its own card, so it is not repeated below.
  const best = all ? r.best : null;
  const groups = take(r.groups.filter((g) => !(best?.kind === "group" && best.item.id === g.id)), "groups");
  const comedians = take(r.comedians.filter((c) => !(best?.kind === "comedian" && best.item.id === c.id)), "comedians");
  const shows = take(r.shows, "shows");
  const tours = take(r.tours, "tours");
  const venues = take(r.venues, "venues");
  const section = "flex flex-col gap-3.5 md:gap-4";

  return (
    <div className={`${container} flex flex-col gap-8 pt-6 pb-10 md:gap-10 md:pb-14`}>
      {best && (
        <section aria-label="Best match" className={section}>
          <SectionHead
            title={best.kind === "group" ? "Groups" : "Comedians"}
            q={q}
            tab={tab}
            total={0}
            shown={0}
            note="Best match"
          />
          {best.kind === "group" ? <GroupResult group={best.item} best /> : <BestComedianResult comedian={best.item} />}
        </section>
      )}

      {(tab === "all" || tab === "groups") && groups.length > 0 && (
        <section aria-label="Groups" className={section}>
          <SectionHead
            title={best?.kind === "group" ? "More groups" : "Groups"}
            q={q}
            tab="groups"
            total={n.groups}
            shown={groups.length + (best?.kind === "group" ? 1 : 0)}
          />
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <GroupResult key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "comedians") && comedians.length > 0 && (
        <section aria-label="Comedians" className={section}>
          <SectionHead title="Comedians" q={q} tab="comedians" total={n.comedians} shown={comedians.length + (best?.kind === "comedian" ? 1 : 0)} />
          <div
            className={
              all
                ? "no-scrollbar -mx-[18px] flex snap-x scroll-px-[18px] gap-3 overflow-x-auto px-[18px] md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0"
                : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4 [&>a]:w-auto"
            }
          >
            {comedians.map((c, i) => (
              <ComedianResult key={c.id} comedian={c} index={i} />
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "shows") && shows.length > 0 && (
        <section aria-label="Shows" className={section}>
          <SectionHead title="Shows" q={q} tab="shows" total={n.shows} shown={shows.length} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-5">
            {shows.map((s) => (
              <ShowCard key={s.id} show={s} now={now} />
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "tours") && tours.length > 0 && (
        <section aria-label="Tours" className={section}>
          <SectionHead title="Tours" q={q} tab="tours" total={n.tours} shown={tours.length} />
          <div className="flex flex-col gap-3">
            {tours.map((t) => (
              <TourResult key={t.id} tour={t} />
            ))}
          </div>
        </section>
      )}

      {(tab === "all" || tab === "venues") && venues.length > 0 && (
        <section aria-label="Venues" className={section}>
          <SectionHead title="Venues" q={q} tab="venues" total={n.venues} shown={venues.length} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {venues.map((v) => (
              <VenueResult key={v.id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Everything below the breadcrumb: search bar, title, tabs and results. */
export async function SearchResults({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = normalizeQuery(sp.q);
  const searchable = isSearchable(q);
  const results = searchable ? await searchRadar(q) : null;
  const n = results ? counts(results) : null;
  // A tab with no results falls back to All.
  const requested = parseTab(sp.type);
  const tab = n && n[requested] > 0 ? requested : "all";

  return (
    <>
      <section className={`${container} flex flex-col gap-4 pt-2 pb-2`}>
        <SearchBar key={q} defaultValue={q} />
        {!searchable ? (
          <div className="flex flex-col gap-2 py-4">
            <h1 className="font-display text-[32px] leading-none md:text-display-lg">
              Search the <span className="text-spotlight-yellow">radar</span>
            </h1>
            <p className="text-base text-lavender-text md:text-lg">
              {q ? "Type at least 2 letters. " : ""}Find a comedian, group, show, tour or venue, in English or Arabic.
            </p>
          </div>
        ) : n && n.all > 0 ? (
          <>
            <h1 className="text-[20px] font-extrabold md:text-[22px]">
              {plural(n.all, "result")} for <span className="text-spotlight-yellow">&ldquo;{q}&rdquo;</span>
            </h1>
            <Tabs q={q} active={tab} n={n} />
          </>
        ) : (
          <div className="flex flex-col gap-2 py-4">
            <h1 className="font-display text-[28px] leading-tight md:text-display-md">
              Nothing on the radar for <span className="text-spotlight-yellow">&ldquo;{q}&rdquo;</span>
            </h1>
            <p className="text-base text-lavender-text md:text-lg">
              Check the spelling, try fewer words, or search the Arabic name.
            </p>
          </div>
        )}
      </section>

      {results && n && n.all > 0 ? <ResultSections r={results} q={q} tab={tab} /> : <div className="pt-6"><Suggestions /></div>}
      <NotWhatBand />
    </>
  );
}

export function SearchResultsSkeleton() {
  return (
    <section className={`${container} flex flex-col gap-4 pt-2 pb-10`} aria-hidden="true">
      <div className="h-[56px] rounded-2xl bg-white md:h-[62px]" />
      <div className="h-7 w-64 rounded-md bg-radar-plum" />
      <div className="h-40 rounded-card bg-radar-plum" />
    </section>
  );
}
