import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";

/**
 * Fonts and logo for the social images. Satori cannot read woff2, so the TTF
 * files live in assets/fonts (not public). Read once per server instance.
 */
type SocialFont = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };
type SocialAssets = { fonts: SocialFont[]; logo: string };
let assets: Promise<SocialAssets> | null = null;

const buf = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export function socialAssets(): Promise<SocialAssets> {
  assets ??= (async (): Promise<SocialAssets> => {
    const root = process.cwd();
    const [luckiest, nunito700, nunito800, logo] = await Promise.all([
      readFile(join(root, "assets/fonts/LuckiestGuy-Regular.ttf")),
      readFile(join(root, "assets/fonts/Nunito-Bold.ttf")),
      readFile(join(root, "assets/fonts/Nunito-ExtraBold.ttf")),
      readFile(join(root, "public/brand/logos/comedy-radar-horizontal-dark.svg")),
    ]);
    return {
      fonts: [
        { name: "Luckiest Guy", data: buf(luckiest), weight: 400, style: "normal" },
        { name: "Nunito", data: buf(nunito700), weight: 700, style: "normal" },
        { name: "Nunito", data: buf(nunito800), weight: 800, style: "normal" },
      ],
      logo: `data:image/svg+xml;base64,${logo.toString("base64")}`,
    };
  })().catch((e) => {
    assets = null;
    throw e;
  });
  return assets as Promise<SocialAssets>;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/**
 * Fetches the comedian photo on the server and returns it as a data URL, so
 * the render never waits on the browser. Null (placeholder circle) when the
 * photo is missing, too big, an unsupported type or does not load in time.
 */
export async function photoDataUrl(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!IMAGE_TYPES.includes(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Same rule as the rest of /admin (spec 11.5): accounts.is_super_admin, not
 * suspended, and 2-step verification (aal2). Never redirects, so the image
 * route can answer 403 instead. Returns the Supabase client when allowed.
 */
export async function superAdminClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const { data: row } = await supabase
    .from("accounts")
    .select("is_super_admin, is_suspended")
    .eq("id", uid)
    .maybeSingle();
  if (!row?.is_super_admin || row.is_suspended) return null;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return null;
  return supabase;
}
