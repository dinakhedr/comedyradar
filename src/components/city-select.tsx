"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { City } from "@/lib/data/types";
import { ChevronDown } from "./icons";

/**
 * City dropdown. Changing it updates the "city" filter in the address
 * (e.g. /?when=month&city=cairo), so the Coming up list follows it.
 */
export function CitySelect({
  cities,
  variant,
  id,
}: {
  cities: City[];
  variant: "header" | "chip";
  id: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("city") ?? "";

  const onChange = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("city", value);
    else next.delete("city");
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const allLabel = variant === "header" ? (cities[0] ? `All of ${cities[0].country_name}` : "Egypt") : "All cities";

  return (
    <div className="relative inline-flex">
      <label htmlFor={id} className="sr-only">
        City
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 cursor-pointer appearance-none border-2 border-plum-line pr-9 font-bold text-white ${
          variant === "header"
            ? "rounded-button bg-transparent py-2.5 pl-4 text-[15px]"
            : "rounded-full bg-radar-plum py-2.5 pl-5 text-sm md:text-[15px]"
        }`}
      >
        <option value="" className="bg-radar-purple">
          {allLabel}
        </option>
        {cities.map((c) => (
          <option key={c.id} value={c.slug} className="bg-radar-purple">
            {variant === "header" ? `${c.name}, ${c.country_name}` : c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
    </div>
  );
}
