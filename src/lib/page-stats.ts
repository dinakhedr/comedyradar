/** Kinds of counters kept in page_stats (page views and "Get tickets" clicks). */
export const STAT_KINDS = ["comedian_view", "group_view", "show_view", "tour_view", "ticket_click"] as const;
export type StatKind = (typeof STAT_KINDS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

/** The counter a request asks for, or null when it is not a valid one. */
export function parseStat(body: unknown): { kind: StatKind; id: string } | null {
  if (!body || typeof body !== "object") return null;
  const { kind, id } = body as Record<string, unknown>;
  if (typeof kind !== "string" || !(STAT_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof id !== "string" || !UUID.test(id)) return null;
  return { kind: kind as StatKind, id: id.toLowerCase() };
}

/** Search engines, link previews and test browsers are not counted. */
export const isBot = (userAgent: string | null) => !userAgent || BOT.test(userAgent);

/** Page views (all kinds except ticket clicks) and ticket clicks, from my_page_stats rows. */
export function sumStats(rows: { kind: string; entity_id: string; total: number | string }[]) {
  let views = 0;
  let clicks = 0;
  const clicksByShow = new Map<string, number>();
  for (const r of rows) {
    const n = Number(r.total) || 0;
    if (r.kind === "ticket_click") {
      clicks += n;
      clicksByShow.set(r.entity_id, (clicksByShow.get(r.entity_id) ?? 0) + n);
    } else views += n;
  }
  return { views, clicks, clicksByShow };
}
