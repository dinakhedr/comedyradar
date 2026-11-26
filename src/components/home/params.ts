import { getHomeSettings } from "@/lib/data/home";
import { parseCountry } from "@/lib/countries";
import { parseWhen, type WhenFilter } from "@/lib/dates";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Reads the homepage filters from the address (?when=…&city=…). */
export async function homeFilters(searchParams: SP): Promise<{
  when: WhenFilter;
  city: string | null;
  /** Two-letter code, or null for Egypt (the default). */
  country: string | null;
  defaultCity: string;
}> {
  const [sp, settings] = await Promise.all([searchParams, getHomeSettings()]);
  const rawCity = Array.isArray(sp.city) ? sp.city[0] : sp.city;
  const city = rawCity && /^[a-z0-9-]{1,60}$/.test(rawCity) ? rawCity : null;
  return { when: parseWhen(sp.when), city, country: parseCountry(sp.country), defaultCity: settings.defaultCity };
}
