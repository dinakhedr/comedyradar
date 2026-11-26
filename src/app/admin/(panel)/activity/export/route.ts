import {
  activityActionOf,
  activityCsv,
  activityPeriodOf,
  activityTypeOf,
} from "@/lib/admin-activity";
import { fetchActivity } from "@/lib/data/admin";
import { UUID } from "@/lib/profile-server";

/** Activity log as CSV (spec 11.5 item 7), with the same filters as the page. Up to 5,000 entries. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const get = (k: string) => sp.get(k) ?? "";
  const data = await fetchActivity({
    q: get("q").slice(0, 80),
    who: UUID.test(get("who")) ? get("who") : "",
    type: activityTypeOf(get("type")),
    action: activityActionOf(get("action")),
    period: activityPeriodOf(get("period") || undefined),
    limit: 5000,
  });
  // The database checks the super admin and 2-step; anyone else gets nothing.
  if (!data) return new Response("Not found", { status: 404 });
  const day = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Cairo",
  });
  return new Response(activityCsv(data.rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="comedy-radar-activity-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
