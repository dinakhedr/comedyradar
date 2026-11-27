import { parseCountry } from "@/lib/countries";
import { parseWhen, type WhenFilter } from "@/lib/dates";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Reads the homepage filters from the address (?when=…&country=…&range=1). */
export async function homeFilters(searchParams: SP): Promise<{
  when: WhenFilter;
  /** Two-letter code, or null for Egypt (the default). Shared with the header country menu. */
  country: string | null;
  /** "Within range" is on: only shows in the picked country. */
  withinRange: boolean;
}> {
  const sp = await searchParams;
  const range = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  return { when: parseWhen(sp.when), country: parseCountry(sp.country), withinRange: range === "1" };
}
