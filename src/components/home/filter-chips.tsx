import Link from "next/link";
import type { City } from "@/lib/data/types";
import { parseWhen, type WhenFilter } from "@/lib/dates";
import { CitySelect } from "../city-select";
import { homeFilters } from "./params";

const WHEN_LABELS: { value: WhenFilter; label: string }[] = [
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "This weekend" },
  { value: "month", label: "This month" },
];

function href(when: WhenFilter, city: string | null) {
  const p = new URLSearchParams();
  if (when !== "month") p.set("when", when);
  if (city) p.set("city", city);
  const qs = p.toString();
  return qs ? `/?${qs}#coming-up` : "/#coming-up";
}

const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm md:px-5 md:text-[15px]";
const on = "border-spotlight-yellow bg-spotlight-yellow font-extrabold text-radar-purple";
const off = "border-plum-line font-bold text-white hover:border-spotlight-yellow";

/**
 * Filter chips: Tonight · This weekend · This month (default) · Within range,
 * plus the city dropdown. "Within range" = shows in the chosen city
 * (Cairo by default). The choice lives in the address, e.g. /?when=weekend&city=cairo.
 */
export async function FilterChips({
  searchParams,
  cities,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  cities: City[];
}) {
  const { when, city, defaultCity } = await homeFilters(searchParams);
  const withinRange = city !== null;

  return (
    <div role="group" aria-label="Filter shows" className="no-scrollbar -mx-[18px] flex items-center gap-2 overflow-x-auto px-[18px] pb-1 md:mx-0 md:flex-wrap md:gap-2.5 md:overflow-visible md:px-0">
      {WHEN_LABELS.map((w) => (
        <Link
          key={w.value}
          href={href(w.value, city)}
          scroll={false}
          aria-current={when === w.value ? "true" : undefined}
          className={`${chip} ${when === w.value ? on : off}`}
        >
          {w.label}
        </Link>
      ))}
      <Link
        href={href(when, withinRange ? null : defaultCity)}
        scroll={false}
        aria-current={withinRange ? "true" : undefined}
        className={`${chip} ${withinRange ? on : off}`}
      >
        Within range
      </Link>
      <span className="hidden h-7 w-0.5 bg-plum-line md:block" aria-hidden />
      <CitySelect cities={cities} variant="chip" id="hero-city" />
    </div>
  );
}

export function FilterChipsSkeleton() {
  const w = parseWhen(undefined);
  return (
    <div className="flex gap-2 overflow-hidden" aria-hidden>
      {WHEN_LABELS.map((x) => (
        <span key={x.value} className={`${chip} ${x.value === w ? on : off}`}>
          {x.label}
        </span>
      ))}
      <span className={`${chip} ${off}`}>Within range</span>
    </div>
  );
}
