"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { flagOf, parseCountry } from "@/lib/countries";
import { ChevronDown } from "./icons";

/**
 * Header country menu: a flag and the country name, Egypt by default.
 * Picking another country adds ?country=ae to the address (the homepage
 * Coming up list and its city menu follow it).
 */
export function CountrySelect({ countries, id }: { countries: { code: string; name: string }[]; id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = parseCountry(params.get("country")) ?? "EG";
  const list = countries.some((c) => c.code === "EG") ? countries : [{ code: "EG", name: "Egypt" }, ...countries];

  const onChange = (code: string) => {
    const next = new URLSearchParams(params.toString());
    if (code === "EG") next.delete("country");
    else next.set("country", code.toLowerCase());
    next.delete("city"); // a city belongs to one country
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
        className="min-h-11 w-36 max-w-44 cursor-pointer appearance-none truncate field-sizing-content rounded-button border-2 border-plum-line bg-transparent py-2 pr-8 pl-3 text-[15px] font-bold text-white"
      >
        {list.map((c) => (
          <option key={c.code} value={c.code} className="bg-radar-purple">
            {`${flagOf(c.code)} ${c.name}`}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2" />
    </div>
  );
}
