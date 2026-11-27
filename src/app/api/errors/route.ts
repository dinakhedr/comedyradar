import { isBot } from "@/lib/page-stats";
import { toReport } from "@/lib/site-errors";
import { recordSiteError } from "@/lib/site-errors-server";

/** Saves one browser error (sent by the error page) to the error log in Activity log. */
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return new Response(null, { status: 204 });
  // Only from our own pages.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse((await request.text()).slice(0, 8000));
    if (parsed && typeof parsed === "object")
      body = parsed as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = toReport({
    source: "browser",
    message: body.message,
    path: body.path,
    stack: body.stack,
    user_agent: ua,
  });
  if (!report) return new Response(null, { status: 400 });
  await recordSiteError(report, request.headers.get("cookie"));
  return new Response(null, { status: 204 });
}
