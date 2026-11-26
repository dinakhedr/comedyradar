/**
 * Create or claim a profile (docs/website-spec.md 11.3 and 11.4 item 2).
 */
import { GROUP_LANGUAGES, GROUP_STYLES, type GroupLanguage, type GroupStyle } from "./group-styles";

export type ProfileKind = "comedian" | "group";

/** "Badr Nour" → "badr-nour". Arabic-only or empty names fall back to the kind. */
export function slugify(name: string, fallback = "profile"): string {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || fallback;
}

/** A free slug: the base, then base-2, base-3 … */
export function nextSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

const SOCIAL_HOSTS = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  facebook: ["facebook.com", "fb.com"],
} as const;
export type Social = keyof typeof SOCIAL_HOSTS;

export const SOCIAL_FIELDS: { key: Social; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@handle or instagram.com/…" },
  { key: "tiktok", label: "TikTok", placeholder: "@handle or tiktok.com/@…" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@…" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/…" },
];

/**
 * A social link as a full https URL, or null when empty. "@handle" works for
 * Instagram and TikTok. Returns "invalid" for anything that is not that site.
 */
export function cleanSocial(kind: Social, raw: string): string | null | "invalid" {
  let v = raw.trim();
  if (!v) return null;
  if (v.startsWith("@") && /^@[A-Za-z0-9._]{1,30}$/.test(v)) {
    if (kind === "instagram") return `https://instagram.com/${v.slice(1)}`;
    if (kind === "tiktok") return `https://www.tiktok.com/${v}`;
    return "invalid";
  }
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    if (!(SOCIAL_HOSTS[kind] as readonly string[]).includes(host)) return "invalid";
    if (u.pathname.length <= 1) return "invalid";
    u.protocol = "https:";
    u.hash = "";
    return u.toString().slice(0, 300);
  } catch {
    return "invalid";
  }
}

export type ProfileInput = {
  kind: ProfileKind;
  name: string;
  name_ar: string;
  bio: string;
  country: string;
  socials: Record<Social, string>;
  styles: string[];
  language: string;
};

export type ProfileValues = {
  name: string;
  name_ar: string | null;
  bio: string | null;
  home_country_id: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  styles?: GroupStyle[];
  performing_language?: GroupLanguage | null;
};

export type ProfileErrors = Partial<Record<"name" | "name_ar" | "bio" | "country" | Social | "language", string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks the profile form and returns the values to save, or the errors. */
export function checkProfile(f: ProfileInput): { values?: ProfileValues; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const name = f.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Please enter the name (at least 2 letters).";
  else if (name.length > 80) errors.name = "Please use at most 80 characters.";
  else if (!/[A-Za-z]/.test(name)) errors.name = "Please write the name in English letters. The Arabic name has its own field.";
  const nameAr = f.name_ar.trim().replace(/\s+/g, " ");
  if (nameAr.length > 80) errors.name_ar = "Please use at most 80 characters.";
  const bio = f.bio.trim();
  if (bio.length > 1500) errors.bio = "Please keep the bio under 1,500 characters.";
  if (f.country && !UUID.test(f.country)) errors.country = "Please pick a country from the list.";
  const links = {} as Record<Social, string | null>;
  for (const { key, label } of SOCIAL_FIELDS) {
    const v = cleanSocial(key, f.socials[key] ?? "");
    if (v === "invalid") errors[key] = `Please paste a ${label} link${key === "instagram" || key === "tiktok" ? " or @handle" : ""}.`;
    else links[key] = v;
  }
  const styles = GROUP_STYLES.map((s) => s.value).filter((v) => f.styles.includes(v));
  const language = f.language ? GROUP_LANGUAGES.find((l) => l.value === f.language)?.value : null;
  if (f.language && !language) errors.language = "Please pick a language from the list.";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    values: {
      name,
      name_ar: nameAr || null,
      bio: bio || null,
      home_country_id: f.country || null,
      instagram_url: links.instagram,
      tiktok_url: links.tiktok,
      youtube_url: links.youtube,
      facebook_url: links.facebook,
      ...(f.kind === "group" ? { styles, performing_language: language ?? null } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export const CLAIM_RELATIONS: Record<ProfileKind, { value: string; label: string }[]> = {
  comedian: [
    { value: "self", label: "I am this comedian" },
    { value: "manager", label: "I am the manager" },
  ],
  group: [
    { value: "member", label: "A member of the group" },
    { value: "manager", label: "I am the manager" },
  ],
};

export const PROOF_METHODS = [
  {
    value: "official_dm",
    label: "Message from the official account",
    hint: "Fastest. Send one Instagram DM to @comedy_radar from the profile's official account, with your account email.",
  },
  {
    value: "comedian_confirms",
    label: "The comedian or a group member confirms",
    hint: "We give you a private link. Send it to them on WhatsApp or by email; one tap confirms you.",
  },
  {
    value: "business_email",
    label: "Business email",
    hint: "A confirmation link to the booking or management email shown on the official pages.",
  },
  {
    value: "document",
    label: "Document",
    hint: "A management contract or a signed authorisation letter (PDF or photo, up to 10 MB). Only Comedy Radar sees it.",
  },
  { value: "call", label: "Short call", hint: "A short call with the Comedy Radar team." },
] as const;
export type ProofMethod = (typeof PROOF_METHODS)[number]["value"];

/** Proof methods offered now. Business email needs an email service (later, Dina's choice). */
export const AVAILABLE_PROOFS: ProofMethod[] = PROOF_METHODS.map((m) => m.value).filter((m) => m !== "business_email");

export type ClaimErrors = Partial<Record<"relation" | "method" | "proof" | "file", string>>;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/** Instagram handle without "@" (or null when not valid). */
export function cleanHandle(raw: string): string | null {
  const v = raw.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v.toLowerCase() : null;
}

export function checkClaim(
  kind: ProfileKind,
  f: { relation: string; method: string; proof: string; file?: { size: number; type: string } | null },
  available: readonly string[],
): { errors: ClaimErrors; proofValue: string | null } {
  const errors: ClaimErrors = {};
  if (!CLAIM_RELATIONS[kind].some((r) => r.value === f.relation)) errors.relation = "Please choose who you are.";
  if (!available.includes(f.method)) errors.method = "Please choose how you will prove it.";
  let proofValue: string | null = null;
  if (f.method === "official_dm") {
    proofValue = cleanHandle(f.proof);
    if (!proofValue) errors.proof = "Please enter the Instagram handle you will message from, like @yourname.";
  } else if (f.method === "comedian_confirms") {
    proofValue = f.proof.trim().slice(0, 80) || null;
    if (!proofValue) errors.proof = "Please enter the name of the person who will confirm.";
  } else if (f.method === "call") {
    proofValue = f.proof.trim().slice(0, 40) || null;
    if (!proofValue || !/^[+0-9 ()-]{7,40}$/.test(proofValue)) errors.proof = "Please enter a phone number we can call.";
  } else if (f.method === "document") {
    if (!f.file || f.file.size === 0) errors.file = "Please attach the document.";
    else if (f.file.size > MAX_DOCUMENT_BYTES) errors.file = "The file is larger than 10 MB.";
    else if (!DOCUMENT_TYPES.includes(f.file.type)) errors.file = "Please attach a PDF, JPG or PNG file.";
  }
  return { errors, proofValue };
}
