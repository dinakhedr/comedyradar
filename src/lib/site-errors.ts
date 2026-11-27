/** Error log (Activity log, Errors tab): cleaning reports, labels and CSV. */

export type ErrorSource = "render" | "action" | "route" | "proxy" | "browser";

export type SiteErrorReport = {
  source: ErrorSource;
  message: string;
  digest: string | null;
  path: string | null;
  route: string | null;
  method: string | null;
  user_agent: string | null;
  stack: string | null;
};

export type SiteError = SiteErrorReport & {
  id: number;
  created_at: string;
  last_seen_at: string;
  times: number;
  who: string | null;
  role: string | null;
};

export const ERROR_SOURCES = [
  { value: "server", label: "On the server" },
  { value: "browser", label: "In the browser" },
] as const;

export const ERROR_PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All (90 days)" },
] as const;

const pick = (
  list: readonly { value: string }[],
  v: string | undefined,
  fallback: string,
) => (list.some((x) => x.value === v) ? (v as string) : fallback);
export const errorSourceOf = (v?: string) => pick(ERROR_SOURCES, v, "");
export const errorPeriodOf = (v?: string) => pick(ERROR_PERIODS, v, "7d");

/** Where the error happened, in plain words. */
export function sourceLabel(s: string): string {
  switch (s) {
    case "render":
      return "Server · loading a page";
    case "action":
      return "Server · saving a form";
    case "route":
      return "Server · link or file";
    case "proxy":
      return "Server · before the page";
    case "browser":
      return "Browser";
    default:
      return s;
  }
}

/** Paths whose last part is a secret link (invites, claim confirmations). */
const SECRET_PATHS = [/^(\/team\/invite\/)[^/]+/, /^(\/claim\/confirm\/)[^/]+/];

/** The page path without the query string, secret tokens or the domain. */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let p = raw.trim();
  try {
    p = new URL(p, "http://x").pathname;
  } catch {
    p = p.split(/[?#]/)[0];
  }
  for (const re of SECRET_PATHS) p = p.replace(re, "$1[hidden]");
  return p.slice(0, 500) || null;
}

/**
 * Next.js uses thrown "errors" for redirects, not-found pages and similar.
 * They are not real errors, so they are not logged.
 */
export function isControlFlow(err: unknown): boolean {
  const digest =
    err && typeof err === "object" && "digest" in err
      ? String((err as { digest: unknown }).digest)
      : "";
  return /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING|HANGING_PROMISE_REJECTION)/.test(
    digest,
  );
}

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** A safe, size-limited report from anything (server error or browser POST body). */
export function toReport(input: {
  source: unknown;
  error?: unknown;
  message?: unknown;
  digest?: unknown;
  path?: unknown;
  route?: unknown;
  method?: unknown;
  user_agent?: unknown;
  stack?: unknown;
}): SiteErrorReport | null {
  const sources: ErrorSource[] = [
    "render",
    "action",
    "route",
    "proxy",
    "browser",
  ];
  const source = sources.find((s) => s === input.source);
  if (!source) return null;
  const err = input.error;
  const message =
    str(input.message, 1000) ??
    (err instanceof Error ? str(err.message, 1000) : null) ??
    (typeof err === "string" ? str(err, 1000) : null) ??
    "Unknown error";
  const digestRaw =
    input.digest ??
    (err && typeof err === "object" && "digest" in err
      ? (err as { digest: unknown }).digest
      : null);
  const digest =
    typeof digestRaw === "string" && /^[\w-]{1,64}$/.test(digestRaw)
      ? digestRaw
      : null;
  return {
    source,
    message,
    digest,
    path: cleanPath(input.path),
    route: str(input.route, 300),
    method: str(input.method, 10)?.toUpperCase() ?? null,
    user_agent: str(input.user_agent, 300),
    stack:
      str(input.stack, 4000) ??
      (err instanceof Error ? str(err.stack, 4000) : null),
  };
}

/** "Chrome on Mac" from a user agent, or null. */
export function browserName(ua: string | null): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone/iPad"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (!browser && !os) return null;
  return [browser ?? "Unknown browser", os].filter(Boolean).join(" on ");
}

const cell = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
/** Cells that start with =, +, - or @ are made safe for spreadsheets. */
const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function errorsCsv(rows: SiteError[]): string {
  const head = [
    "Time (Cairo)",
    "Last seen (Cairo)",
    "Times",
    "Where",
    "Message",
    "Page",
    "Reference",
    "Who",
    "Browser",
  ];
  const t = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Cairo" });
  const lines = rows.map((r) =>
    [
      t(r.created_at),
      t(r.last_seen_at),
      String(r.times),
      sourceLabel(r.source),
      r.message,
      r.path ?? "",
      r.digest ?? "",
      r.who ?? "Visitor (not signed in)",
      browserName(r.user_agent) ?? "",
    ]
      .map((v) => cell(safe(v)))
      .join(","),
  );
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}
