import type { Instrumentation } from "next";

/** Every server error (loading a page, saving a form, a route) goes to the error log in Activity log. */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const { isControlFlow, toReport } = await import("@/lib/site-errors");
  if (isControlFlow(err)) return;
  const h = request.headers;
  const header = (k: string) => {
    const v = h[k];
    return Array.isArray(v) ? v.join("; ") : v;
  };
  const report = toReport({
    source:
      context.routeType === "render"
        ? "render"
        : context.routeType === "action"
          ? "action"
          : context.routeType === "proxy"
            ? "proxy"
            : "route",
    error: err,
    path: request.path,
    route: context.routePath,
    method: request.method,
    user_agent: header("user-agent"),
  });
  if (!report) return;
  const { recordSiteError } = await import("@/lib/site-errors-server");
  await recordSiteError(report, header("cookie"));
};
