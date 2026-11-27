import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SiteErrorReport } from "@/lib/site-errors";

/** Cookies from a raw Cookie header (read only). */
function parseCookies(header: string | null | undefined) {
  if (!header) return [];
  return header
    .split(";")
    .map((p) => {
      const i = p.indexOf("=");
      if (i < 0) return null;
      const name = p.slice(0, i).trim();
      let value = p.slice(i + 1).trim();
      try {
        value = decodeURIComponent(value);
      } catch {
        // keep the raw value
      }
      return name ? { name, value } : null;
    })
    .filter((c): c is { name: string; value: string } => c !== null);
}

/**
 * Saves one error to the error log. The visitor's own session cookies are
 * sent along, so the database knows who was signed in (if anyone).
 * It never throws: logging must not cause a second error.
 */
export async function recordSiteError(
  report: SiteErrorReport,
  cookieHeader: string | null | undefined,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  try {
    const cookies = parseCookies(cookieHeader);
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookies,
        setAll: () => {},
      },
    });
    const { error } = await supabase.rpc("log_site_error", { p: report });
    if (error) console.error("log_site_error", error.message);
  } catch (e) {
    console.error("log_site_error", e instanceof Error ? e.message : e);
  }
}
