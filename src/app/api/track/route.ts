import { createPublicClient } from "@/lib/supabase/public";
import { isBot, parseStat } from "@/lib/page-stats";

/**
 * Counts one page view or "Get tickets" click (sent with navigator.sendBeacon).
 * Only totals per day are kept; nothing about the visitor is stored.
 */
export async function POST(request: Request) {
  if (isBot(request.headers.get("user-agent"))) return new Response(null, { status: 204 });
  let body: unknown = null;
  try {
    body = JSON.parse((await request.text()).slice(0, 500));
  } catch {
    return new Response(null, { status: 400 });
  }
  const stat = parseStat(body);
  if (!stat) return new Response(null, { status: 400 });
  const db = createPublicClient();
  if (db) {
    const { error } = await db.rpc("record_page_stat", { p_kind: stat.kind, p_id: stat.id });
    if (error) console.error("record_page_stat", error.message);
  }
  return new Response(null, { status: 204 });
}
