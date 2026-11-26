import Link from "next/link";
import { Badge } from "../badge";
import { SearchIcon } from "../icons";
import { Avatar } from "../lineup-card";
import { CoverImage } from "../placeholder-image";
import { ProfilesSwitch } from "../profiles-switch";
import { NavSelect } from "../shows/nav-controls";
import { getGroupsListing, type GroupListItem } from "@/lib/data/groups";
import { formatShowDate } from "@/lib/dates";
import { GROUP_LANGUAGES, GROUP_STYLES, languageLine, styleLabel } from "@/lib/group-styles";
import {
  filterGroups,
  groupsHref,
  GROUPS_SHOW_OPTIONS,
  GROUPS_SORT_OPTIONS,
  GROUPS_STEP,
  parseGroupsFilters,
  type GroupsFilters,
} from "@/lib/groups-filters";

type SP = Promise<Record<string, string | string[] | undefined>>;

const container = "mx-auto max-w-[1280px] px-[18px] md:px-8";
const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm md:px-[18px] md:text-[15px]";
const chipOn = "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple";
const chipOff = "border-plum-line font-bold text-white hover:border-spotlight-yellow";

/** Group card (spec 7.4 item 3): photo, badges, name, member avatars, next show or tour line, "View group". */
function GroupCard({ g }: { g: GroupListItem }) {
  const shown = g.members.slice(0, 5);
  const next = g.next_show_at ? formatShowDate(new Date(g.next_show_at)).split(" · ")[0] : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-[18px] bg-radar-plum md:rounded-card">
      <CoverImage src={g.photo_url} alt="" tone="deep" iconSize={48} className="h-[160px] w-full md:h-[200px]" />
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4 md:gap-2.5 md:px-5 md:pt-[18px] md:pb-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="yellow">Group</Badge>
          {g.on_tour && <Badge tone="pink">On tour</Badge>}
          {g.styles.slice(0, 2).map((s) => (
            <Badge key={s} tone="purple">
              {styleLabel(s)}
            </Badge>
          ))}
          {g.styles.length > 2 && <Badge tone="purple">+{g.styles.length - 2}</Badge>}
          {!g.next_show_at && <Badge tone="outline">No dates yet</Badge>}
        </div>
        <h2 className="font-display text-[24px] leading-tight md:text-[28px]">
          <Link href={`/groups/${g.slug}`} className="hover:text-spotlight-yellow">
            {g.name}
          </Link>
        </h2>
        {g.members.length > 0 && (
          <div className="flex items-center gap-2.5">
            <ul className="flex" aria-label={`Members: ${g.member_names.join(", ")}`}>
              {shown.map((m, i) => (
                <li key={m.id} className={i > 0 ? "-ml-2.5" : ""}>
                  <Avatar person={m} ring={i % 2 === 0 ? "pink" : "yellow"} size="h-[30px] w-[30px] md:h-[34px] md:w-[34px]" />
                </li>
              ))}
            </ul>
            <span className="text-[13px] font-bold md:text-sm">
              {g.members.length} {g.members.length === 1 ? "comedian" : "comedians"}
              {g.performing_language && (
                <span className="font-normal text-lavender-text"> · {languageLine(g.performing_language)}</span>
              )}
            </span>
          </div>
        )}
        <p className="text-[13px] text-lavender-text md:text-sm">
          {g.tour ? (
            <>
              On tour:{" "}
              <Link href={`/tours/${g.tour.slug}`} className="font-bold text-white hover:text-spotlight-yellow">
                {g.tour.name}
              </Link>{" "}
              · {g.tour.show_count} {g.tour.show_count === 1 ? "show" : "shows"}
            </>
          ) : next ? (
            <>
              Next show: {next}
              {g.next_city_name ? ` · ${g.next_city_name}` : ""}
            </>
          ) : (
            "No upcoming shows yet"
          )}
        </p>
        <Link
          href={`/groups/${g.slug}`}
          className="mt-auto flex min-h-11 items-center justify-center rounded-button bg-spotlight-yellow px-5 text-sm font-extrabold text-radar-purple hover:bg-white md:self-start md:text-[15px]"
        >
          View group
        </Link>
      </div>
    </article>
  );
}

function SearchForm({ f }: { f: GroupsFilters }) {
  const keep = new URLSearchParams(groupsHref(f, { q: "" }).split("?")[1] ?? "");
  return (
    <form action="/groups" role="search" className="flex w-full gap-1.5 rounded-[14px] bg-white p-[5px] md:gap-2 md:rounded-2xl md:p-1.5">
      {[...keep.entries()].map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="groups-q" className="sr-only">
        Search groups
      </label>
      <input
        id="groups-q"
        name="q"
        type="search"
        defaultValue={f.q}
        placeholder="Search a group or one of its members"
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

/** All groups (docs/website-spec.md, 7.4). */
export async function GroupsListing({ searchParams }: { searchParams: SP }) {
  const f = parseGroupsFilters(await searchParams);
  const { groups, comedianCount } = await getGroupsListing();
  const matches = filterGroups(groups, f);
  const visible = matches.slice(0, f.count);
  const isFiltered = groupsHref(f) !== "/groups";

  return (
    <>
      <section className={`${container} flex flex-col gap-3 pb-4 md:gap-4 md:pb-6`}>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[40px] leading-none tracking-[1.5px] md:text-[56px] md:tracking-[2px]">
              COMEDY <span className="text-spotlight-yellow">GROUPS</span>
            </h1>
            <p className="text-sm text-lavender-text md:text-[17px]">Comedians who perform together as one act.</p>
          </div>
          <ProfilesSwitch current="groups" comedians={comedianCount} groups={groups.length} />
        </div>
        <SearchForm f={f} />
      </section>

      <section aria-label="Filters" className={`${container} flex flex-col gap-3 pb-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:pb-6`}>
        <div role="group" aria-label="Filter groups" className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto px-[18px] md:mx-0 md:px-0">
          {GROUPS_SHOW_OPTIONS.map((o) => (
            <Link
              key={o.value}
              href={groupsHref(f, { show: o.value })}
              scroll={false}
              aria-current={f.show === o.value ? "true" : undefined}
              className={`${chip} ${f.show === o.value ? chipOn : chipOff}`}
            >
              <span className="md:hidden">{o.short}</span>
              <span className="hidden md:inline">{o.label}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <NavSelect
          id="groups-style"
          label="Style"
          value={f.style ?? ""}
          options={[
            { value: "", label: "All styles", href: groupsHref(f, { style: null }) },
            ...GROUP_STYLES.map((s) => ({ value: s.value, label: s.label, href: groupsHref(f, { style: s.value }) })),
          ]}
          selectClassName="bg-radar-plum"
        />
        <NavSelect
          id="groups-lang"
          label="Language"
          value={f.lang ?? ""}
          options={[
            { value: "", label: "Any language", href: groupsHref(f, { lang: null }) },
            ...GROUP_LANGUAGES.map((l) => ({ value: l.value, label: l.label, href: groupsHref(f, { lang: l.value }) })),
          ]}
          selectClassName="bg-radar-plum"
        />
        <NavSelect
          id="groups-sort"
          label="Sort by"
          srOnlyLabel={false}
          value={f.sort}
          options={GROUPS_SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label, href: groupsHref(f, { sort: s.value }) }))}
          selectClassName="bg-radar-plum"
        />
        </div>
      </section>

      <section aria-label="Groups" className={`${container} flex flex-col gap-3.5 pb-10 md:gap-5`}>
        <p className="text-[13px] text-lavender-text md:text-[15px]" aria-live="polite">
          {matches.length === 0
            ? "Showing 0 groups"
            : `Showing 1–${visible.length} of ${matches.length} ${matches.length === 1 ? "group" : "groups"}`}
        </p>
        {visible.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-card bg-radar-plum p-6 md:p-10">
            <p className="font-display text-[22px] md:text-display-md">
              {isFiltered ? "Nothing on the radar for these filters" : "No groups on the radar yet"}
            </p>
            {isFiltered && (
              <Link href="/groups" className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 py-3 font-extrabold text-radar-purple hover:bg-white">
                Clear all
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
            {visible.map((g) => (
              <GroupCard key={g.id} g={g} />
            ))}
          </div>
        )}
        {matches.length > visible.length && (
          <div className="flex justify-center pt-1">
            <Link
              href={groupsHref(f, { count: f.count + GROUPS_STEP })}
              scroll={false}
              className="flex min-h-12 w-full items-center justify-center rounded-button border-2 border-spotlight-yellow px-8 text-[15px] font-extrabold text-spotlight-yellow hover:bg-spotlight-yellow hover:text-radar-purple md:w-auto md:text-base"
            >
              Load more groups
            </Link>
          </div>
        )}
      </section>

      <section className={`${container} pb-8 md:pb-14`}>
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-plum-deep p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-card md:px-9 md:py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-[22px] md:text-[32px]">PERFORM AS A GROUP?</h2>
            <p className="text-sm text-lavender-text md:text-base">Add your members and next shows to get your own page.</p>
          </div>
          <Link
            href="/dashboard/profiles/new?type=group"
            className="flex min-h-12 shrink-0 items-center justify-center rounded-button bg-spotlight-yellow px-7 text-[15px] font-extrabold text-radar-purple hover:bg-white md:text-base"
          >
            Add your group
          </Link>
        </div>
      </section>
    </>
  );
}

export function GroupsListingSkeleton() {
  return (
    <div className={`${container} flex flex-col gap-4 pb-10`} aria-busy="true" aria-label="Loading groups">
      <div className="h-12 w-72 rounded-lg bg-radar-plum md:h-14" />
      <div className="h-14 rounded-2xl bg-white/90" />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[400px] animate-pulse rounded-[18px] bg-radar-plum md:rounded-card" />
        ))}
      </div>
    </div>
  );
}
