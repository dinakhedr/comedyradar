"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { City } from "@/lib/data/types";
import { ChevronDown } from "./icons";

/**
 * City dropdown (homepage filter chips). Changing it updates the "city" filter in the address
 * (e.g. /?when=month&city=cairo), so the Coming up list follows it.
 */
export function CitySelect({
  cities,
  id,
}: {
  cities: City[];
  variant: "chip";
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

  return (
    <div className="relative inline-flex">
      <label htmlFor={id} className="sr-only">
        City
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 cursor-pointer appearance-none rounded-full border-2 border-plum-line bg-radar-plum py-2.5 pr-9 pl-5 text-sm font-bold text-white md:text-[15px]"
      >
        <option value="" className="bg-radar-purple">
          All cities
        </option>
        {cities.map((c) => (
          <option key={c.id} value={c.slug} className="bg-radar-purple">
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2" />
    </div>
  );
}
