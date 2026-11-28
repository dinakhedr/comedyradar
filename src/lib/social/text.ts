/**
 * Text rules for the social image templates (see docs/social-templates.md).
 * Pure functions, so they are easy to test and reuse in future templates.
 */

/** Rough width of a line in Luckiest Guy: characters × 0.62 × font size. */
export const CHAR_WIDTH = 0.62;

export function estimateWidth(text: string, fontSize: number): number {
  return [...text].length * CHAR_WIDTH * fontSize;
}

/**
 * The biggest whole font size (from `max` down to `min`) at which every line
 * fits in `maxWidth`. Returns `min` when even that is too wide.
 */
export function fitFontSize(lines: string[], max: number, min: number, maxWidth: number): number {
  const longest = Math.max(0, ...lines.map((l) => [...l.trim()].length));
  if (longest === 0) return max;
  const size = Math.floor(maxWidth / (longest * CHAR_WIDTH));
  return Math.max(min, Math.min(max, size));
}

/** Cleans a typed first name: single spaces, no line breaks, at most 40 characters. */
export function cleanFirstName(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim().slice(0, 40).trim();
}

/**
 * First name = the override when given, else the first word of the English name.
 * Last name = the rest of the name (may be several words, or empty).
 */
export function splitName(name: string, firstOverride?: string | null): { first: string; last: string } {
  const words = name.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const first = cleanFirstName(firstOverride) || words[0] || "";
  const last = words.slice(1).join(" ");
  return { first, last };
}

/** "Taha's", or "Abbas'" when the name ends in s. */
export function possessive(first: string): string {
  return /s$/i.test(first) ? `${first}'` : `${first}'s`;
}

/** Download file name: comedy-radar-<slug>-feature.png */
export function featureFileName(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "comedian";
  return `comedy-radar-${safe}-feature.png`;
}
