"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { flagOf, parseCountry } from "@/lib/countries";
import { ChevronDown } from "./icons";

/**
 * Header country menu: a flag and the country name, Egypt by default.
 * Picking another country adds ?country=ae to the address. The homepage filter
 * row uses the same menu (variant "chip"), so both always show the same country;
 * picking a country there also turns "Within range" on (?range=1).
 */
export function CountrySelect({ countries, id, variant = "header" }: { countries: { code: string; name: string }[]; id: string; variant?: "header" | "chip" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = parseCountry(params.get("country")) ?? "EG";
  const list = countries.some((c) => c.code === "EG") ? countries : [{ code: "EG", name: "Egypt" }, ...countries];

  const onChange = (code: string) => {
    const next = new URLSearchParams(params.toString());
    if (code === "EG") next.delete("country");
    else next.set("country", code.toLowerCase());
    next.delete("city"); // old homepage city filter
    if (variant === "chip") next.set("range", "1");
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="relative inline-flex">
      <label htmlFor={id} className="sr-only">
        Country
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className={
          variant === "chip"
            ? "min-h-11 cursor-pointer appearance-none rounded-full border-2 border-plum-line bg-radar-plum py-2.5 pr-9 pl-5 text-sm font-bold text-white md:text-[15px]"
            : "min-h-11 w-36 max-w-44 cursor-pointer appearance-none truncate field-sizing-content rounded-button border-2 border-plum-line bg-transparent py-2 pr-8 pl-3 text-[15px] font-bold text-white"
        }
      >
        {list.map((c) => (
          <option key={c.code} value={c.code} className="bg-radar-purple">
            {`${flagOf(c.code)} ${c.name}`}
          </option>
        ))}
      </select>
      <ChevronDown className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${variant === "chip" ? "right-3.5" : "right-2.5"}`} />
    </div>
  );
}
