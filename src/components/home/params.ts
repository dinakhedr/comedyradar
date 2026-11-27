import { parseCountry } from "@/lib/countries";
import { parseHomeWhen, type HomeWhen } from "@/lib/home-filters";

type SP = Promise<Record<string, string | string[] | undefined>>;

/** Reads the homepage filters from the address (?when=…&country=…&range=1). */
export async function homeFilters(searchParams: SP): Promise<{
  /** "all" (default, no chip picked) or a chip. */
  when: HomeWhen;
  /** Two-letter code, or null for Egypt (the default). Shared with the header country menu. */
  country: string | null;
  /** "Within range" is on: only shows in the picked country. */
  withinRange: boolean;
}> {
  const sp = await searchParams;
  const range = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  return { when: parseHomeWhen(sp.when), country: parseCountry(sp.country), withinRange: range === "1" };
}
