import Link from "next/link";
import { Badge } from "../badge";
import { SearchIcon } from "../icons";
import { Pagination } from "../pagination";
import { CoverImage } from "../placeholder-image";
import { ProfilesSwitch } from "../profiles-switch";
import { NavSelect, type NavOption } from "../shows/nav-controls";
import {
  comediansHref,
  COMEDIANS_PER_PAGE,
  COMEDIANS_SORT_OPTIONS,
  filterComedians,
  LETTERS,
  parseComediansFilters,
  SHOW_OPTIONS,
  usedLetters,
  type ComediansFilters,
} from "@/lib/comedians-filters";
import { getComediansListing, type ComedianListItem } from "@/lib/data/comedians";

type SP = Promise<Record<string, string | string[] | undefined>>;

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm md:px-[18px] md:text-[15px]";
const chipOn = "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple";
const chipOff = "border-plum-line font-bold text-white hover:border-spotlight-yellow";
const rowLabel = "w-12 shrink-0 text-[13px] font-extrabold tracking-[1px] text-lavender-text";

/** Comedian card (spec 7.3 item 4). The whole card opens the comedian page. */
function ComedianCard({ c }: { c: ComedianListItem }) {
  const group = c.groups[0];
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl bg-radar-plum md:rounded-card">
      <CoverImage src={c.photo_url} alt="" tone="deep" iconSize={44} className="h-[150px] w-full md:h-[220px]" />
      <div className="flex flex-1 flex-col gap-1.5 p-3 md:gap-2 md:px-[18px] md:pt-4 md:pb-[18px]">
        <h2 className="text-base leading-snug font-extrabold md:text-[19px]">
          <Link href={`/comedians/${c.slug}`} className="after:absolute after:inset-0 hover:text-spotlight-yellow">
            {c.name}
          </Link>
        </h2>
        <p className="text-xs text-lavender-text md:text-small">
          {group ? (
            <>
              Member of{" "}
              <Link href={`/groups/${group.slug}`} className="relative z-10 font-extrabold text-spotlight-yellow hover:text-white">
                {group.name}
              </Link>
              {c.groups.length > 1 ? ` +${c.groups.length - 1}` : ""}
            </>
          ) : c.visiting ? (
            `Visiting from ${c.country_name}`
          ) : (
            ["Solo comedian", c.country_name].filter(Boolean).join(" · ")
          )}
        </p>
        <div className="flex flex-wrap gap-1">
          {c.on_tour && <Badge tone="pink">On tour</Badge>}
          {c.visiting && <Badge tone="purple">Visiting</Badge>}
          {c.upcoming_count > 0 ? (
            <Badge tone="yellow">
              {c.upcoming_count} {c.upcoming_count === 1 ? "show" : "shows"}
            </Badge>
          ) : (
            <Badge tone="outline">No dates yet</Badge>
          )}
          {c.has_podcast && <Badge tone="outline">Podcast</Badge>}
        </div>
        <span aria-hidden="true" className="mt-auto pt-1 text-[13px] font-extrabold text-spotlight-yellow md:text-sm">
          View profile ›
        </span>
      </div>
    </article>
  );
}

function SearchForm({ f }: { f: ComediansFilters }) {
  const keep = new URLSearchParams(comediansHref(f, { q: "" }).split("?")[1] ?? "");
  return (
    <form action="/comedians" role="search" className="flex w-full gap-1.5 rounded-[14px] bg-white p-[5px] md:gap-2 md:rounded-2xl md:p-1.5">
      {[...keep.entries()].map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="comedians-q" className="sr-only">
        Search comedians
      </label>
      <input
        id="comedians-q"
        name="q"
        type="search"
        defaultValue={f.q}
        placeholder="Search a comedian by name"
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

function ShowChips({ f, short }: { f: ComediansFilters; short?: boolean }) {
  return SHOW_OPTIONS.map((o) => (
    <Link
      key={o.value}
      href={comediansHref(f, { show: o.value })}
      scroll={false}
      aria-current={f.show === o.value ? "true" : undefined}
      className={`${chip} ${f.show === o.value ? chipOn : chipOff}`}
    >
      {short ? o.short : o.label}
    </Link>
  ));
}

/** All comedians (docs/website-spec.md, 7.3). */
export async function ComediansListing({ searchParams }: { searchParams: SP }) {
  const f = parseComediansFilters(await searchParams);
  const { comedians, countries, groupCount } = await getComediansListing();
  const matches = filterComedians(comedians, f);
  const pages = Math.max(1, Math.ceil(matches.length / COMEDIANS_PER_PAGE));
  const page = Math.min(f.page, pages);
  const visible = matches.slice((page - 1) * COMEDIANS_PER_PAGE, page * COMEDIANS_PER_PAGE);
  // Letters greyed out when no comedian (with the other filters) starts with them.
  const letters = usedLetters(filterComedians(comedians, { ...f, letter: null }));
  const isFiltered = comediansHref(f) !== "/comedians";

  const fromOptions: NavOption[] = [
    { value: "", label: "From: All countries", href: comediansHref(f, { from: null }) },
    ...countries.map((c) => ({ value: c.code, label: `From: ${c.name}`, href: comediansHref(f, { from: c.code }) })),
  ];
  const letterOptions: NavOption[] = [
    { value: "", label: "A–Z: All", href: comediansHref(f, { letter: null }) },
    ...LETTERS.filter((l) => letters.has(l) || l === f.letter).map((l) => ({ value: l, label: l, href: comediansHref(f, { letter: l }) })),
  ];
  const sortSelect = (id: string, mobile?: boolean) => (
    <NavSelect
      id={id}
      label={mobile ? "Sort" : "Sort by"}
      srOnlyLabel={mobile}
      value={f.sort}
      options={COMEDIANS_SORT_OPTIONS.map((s) => ({
        value: s.value,
        label: mobile ? s.short : s.label,
        href: comediansHref(f, { sort: s.value }),
      }))}
      className={mobile ? "flex-1" : ""}
      selectClassName={mobile ? "bg-radar-plum text-sm text-center" : "bg-radar-plum"}
    />
  );

  return (
    <>
      <section className={`${container} flex flex-col gap-3 pb-4 md:gap-4 md:pb-7`}>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-4">
          <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
            ALL <span className="text-spotlight-yellow">COMEDIANS</span>
          </h1>
          <ProfilesSwitch current="comedians" comedians={comedians.length} groups={groupCount} />
        </div>
        <SearchForm f={f} />
      </section>

      {/* Desktop filter panel */}
      <section aria-label="Filters" className={`${container} hidden pb-6 md:block`}>
        <div className="flex flex-col gap-4 rounded-[20px] bg-radar-plum px-[22px] py-5">
          <div role="group" aria-label="Show" className="flex flex-wrap items-center gap-2.5">
            <span className={rowLabel}>SHOW</span>
            <ShowChips f={f} />
            <NavSelect id="d-from" label="From" value={f.from ?? ""} options={fromOptions} className="w-auto" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <nav aria-label="Jump to letter" className="flex flex-wrap items-center gap-1">
              <span className={rowLabel}>A–Z</span>
              <Link
                href={comediansHref(f, { letter: null })}
                scroll={false}
                aria-current={!f.letter ? "true" : undefined}
                className={`inline-flex h-9 items-center rounded-[10px] px-2.5 text-sm font-extrabold ${
                  !f.letter ? "bg-spotlight-yellow text-radar-purple" : "text-white hover:text-spotlight-yellow"
                }`}
              >
                All
              </Link>
              {LETTERS.map((l) =>
                letters.has(l) || l === f.letter ? (
                  <Link
                    key={l}
                    href={comediansHref(f, { letter: l })}
                    scroll={false}
                    aria-current={f.letter === l ? "true" : undefined}
                    className={`inline-flex h-9 min-w-8 items-center justify-center rounded-[10px] text-sm font-extrabold ${
                      f.letter === l ? "bg-spotlight-yellow text-radar-purple" : "text-white hover:text-spotlight-yellow"
                    }`}
                  >
                    {l}
                  </Link>
                ) : (
                  <span key={l} className="inline-flex h-9 min-w-8 items-center justify-center text-sm font-bold text-plum-line" aria-hidden="true">
                    {l}
                  </span>
                ),
              )}
            </nav>
            {isFiltered && (
              <Link href="/comedians" scroll={false} className="min-h-11 px-1 py-2.5 text-[15px] font-extrabold text-spotlight-yellow underline hover:text-white">
                Clear all
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filters */}
      <section aria-label="Filters" className="flex flex-col gap-2.5 pb-4 md:hidden">
        <div role="group" aria-label="Show" className="no-scrollbar flex gap-2 overflow-x-auto px-[18px]">
          <ShowChips f={f} short />
        </div>
        <div className="flex gap-2 px-[18px]">
          <NavSelect id="m-letter" label="Jump to letter" value={f.letter ?? ""} options={letterOptions} className="flex-1" selectClassName="bg-radar-plum text-sm text-center" />
          {sortSelect("m-sort", true)}
        </div>
        {countries.length > 1 && (
          <div className="px-[18px]">
            <NavSelect id="m-from" label="From" value={f.from ?? ""} options={fromOptions} selectClassName="bg-radar-plum text-sm" />
          </div>
        )}
      </section>

      <section aria-label="Comedians" className={`${container} flex flex-col gap-3 pb-10 md:gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-lavender-text md:text-[15px]" aria-live="polite">
            {matches.length === 0
              ? "Showing 0 comedians"
              : `Showing ${(page - 1) * COMEDIANS_PER_PAGE + 1}–${(page - 1) * COMEDIANS_PER_PAGE + visible.length} of ${matches.length} ${
                  matches.length === 1 ? "comedian" : "comedians"
                }`}
          </p>
          <div className="hidden md:block">{sortSelect("d-sort")}</div>
        </div>
        {visible.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-card bg-radar-plum p-6 md:p-10">
            <p className="font-display text-[22px] md:text-display-md">
              {isFiltered ? "Nothing on the radar for these filters" : "No comedians on the radar yet"}
            </p>
            {isFiltered && (
              <Link href="/comedians" className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 py-3 font-extrabold text-radar-purple hover:bg-white">
                Clear all
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {visible.map((c) => (
              <ComedianCard key={c.id} c={c} />
            ))}
          </div>
        )}
        <Pagination page={page} pages={pages} href={(n) => comediansHref(f, { page: n })} />
      </section>

      <section className={`${container} pb-8 md:pb-14`}>
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-plum-deep p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-card md:px-9 md:py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-[22px] md:text-[32px]">ARE YOU A COMEDIAN?</h2>
            <p className="text-sm text-lavender-text md:text-base">Claim your profile to add your bio, shows and podcast links.</p>
          </div>
          <Link
            href="/dashboard/profiles/new"
            className="flex min-h-12 shrink-0 items-center justify-center rounded-button bg-spotlight-yellow px-7 text-[15px] font-extrabold text-radar-purple hover:bg-white md:text-base"
          >
            Claim your profile
          </Link>
        </div>
      </section>
    </>
  );
}

export function ComediansListingSkeleton() {
  return (
    <div className={`${container} flex flex-col gap-4 pb-10`} aria-busy="true" aria-label="Loading comedians">
      <div className="h-12 w-72 rounded-lg bg-radar-plum md:h-14" />
      <div className="h-14 rounded-2xl bg-white/90" />
      <div className="hidden h-[150px] rounded-[20px] bg-radar-plum md:block" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[280px] animate-pulse rounded-2xl bg-radar-plum md:h-[360px] md:rounded-card" />
        ))}
      </div>
    </div>
  );
}
