import { fetchSiteErrors } from "@/lib/data/admin";
import { errorPeriodOf, errorSourceOf, errorsCsv } from "@/lib/site-errors";

/** Error log as CSV, with the same filters as the Errors tab. Up to 5,000 entries. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const get = (k: string) => sp.get(k) ?? "";
  const data = await fetchSiteErrors({
    q: get("q").slice(0, 80),
    source: errorSourceOf(get("source")),
    period: errorPeriodOf(get("period") || undefined),
    limit: 5000,
  });
  // The database checks the super admin and 2-step; anyone else gets nothing.
  if (!data) return new Response("Not found", { status: 404 });
  const day = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Cairo",
  });
  return new Response(errorsCsv(data.rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="comedy-radar-errors-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
