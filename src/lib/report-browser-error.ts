import { errorReference } from "@/lib/error-ref";

/**
 * Sends a browser error to the error log. Errors that have a reference
 * (digest) came from the server and are already logged there.
 */
export function reportBrowserError(error: unknown): void {
  if (typeof window === "undefined" || errorReference(error)) return;
  try {
    const e = error instanceof Error ? error : null;
    const body = JSON.stringify({
      message: e?.message ?? String(error),
      stack: e?.stack ?? null,
      path: window.location.pathname,
    }).slice(0, 8000);
    void fetch("/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let logging cause a second error
  }
}
