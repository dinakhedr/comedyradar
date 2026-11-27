/**
 * Referral tags on outgoing ticket links, so ticket sites (Ticketsmarche and
 * others) can see in their own analytics that buyers came from Comedy Radar.
 */

export const REFERRAL_SOURCE = "comedyradar";
export const REFERRAL_MEDIUM = "referral";

/**
 * The ticket link with utm_source, utm_medium and utm_campaign (the show slug)
 * added. Everything already in the link is kept, including utm tags the
 * organiser put there themselves. Links that are not http(s) come back as they are.
 */
export function withReferral(url: string, campaign: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return url;
  const tags: [string, string][] = [
    ["utm_source", REFERRAL_SOURCE],
    ["utm_medium", REFERRAL_MEDIUM],
    ["utm_campaign", campaign],
  ];
  // An organiser's own utm tags win: only add ours when there are none.
  if ([...u.searchParams.keys()].some((k) => k.toLowerCase().startsWith("utm_"))) return url;
  for (const [k, v] of tags) if (v) u.searchParams.set(k, v);
  return u.toString();
}

