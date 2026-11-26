/**
 * Comedy styles and performing language of a comedy group (approved by Dina, 2026-11-26).
 * Stored in comedy_groups.styles (several) and comedy_groups.performing_language (one).
 */

export const GROUP_STYLES = [
  { value: "stand-up", label: "Stand-up" },
  { value: "improv", label: "Improv" },
  { value: "sketch", label: "Sketch" },
  { value: "roast", label: "Roast" },
  { value: "open-mic", label: "Open mic" },
  { value: "storytelling", label: "Storytelling" },
  { value: "musical", label: "Musical comedy" },
  { value: "dark", label: "Dark comedy" },
  { value: "family", label: "Family friendly" },
] as const;
export type GroupStyle = (typeof GROUP_STYLES)[number]["value"];

export const GROUP_LANGUAGES = [
  { value: "arabic", label: "Arabic", line: "In Arabic" },
  { value: "english", label: "English", line: "In English" },
  { value: "bilingual", label: "Bilingual", line: "Arabic and English" },
] as const;
export type GroupLanguage = (typeof GROUP_LANGUAGES)[number]["value"];

export const isGroupStyle = (v: unknown): v is GroupStyle => GROUP_STYLES.some((s) => s.value === v);
export const isGroupLanguage = (v: unknown): v is GroupLanguage => GROUP_LANGUAGES.some((l) => l.value === v);

/** Known styles only, in the order of the list above. */
export function cleanStyles(raw: unknown): GroupStyle[] {
  const list = Array.isArray(raw) ? raw : [];
  return GROUP_STYLES.map((s) => s.value).filter((v) => list.includes(v));
}

export const styleLabel = (v: GroupStyle) => GROUP_STYLES.find((s) => s.value === v)!.label;
export const languageLine = (v: GroupLanguage) => GROUP_LANGUAGES.find((l) => l.value === v)!.line;

/** A bilingual group matches both the Arabic and the English filter. */
export function languageMatches(group: GroupLanguage | null, wanted: GroupLanguage | null): boolean {
  if (!wanted) return true;
  if (!group) return false;
  return group === wanted || (group === "bilingual" && wanted !== "bilingual");
}
