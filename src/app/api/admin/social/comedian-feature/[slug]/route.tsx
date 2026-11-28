import { ImageResponse } from "next/og";
import { ComedianFeature, FEATURE_SIZE } from "@/lib/social/comedian-feature";
import { photoDataUrl, socialAssets, superAdminClient } from "@/lib/social/server";
import { cleanFirstName, featureFileName } from "@/lib/social/text";

/**
 * Comedian Feature Instagram image (docs/social-templates.md), 1080 × 1350 PNG.
 * Super admin only (with 2-step): everyone else gets 403.
 * ?firstName= changes the first name; ?download=1 saves it as a file and logs it.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/social/comedian-feature/[slug]">) {
  const supabase = await superAdminClient();
  if (!supabase) return new Response("Forbidden", { status: 403, headers: { "cache-control": "no-store" } });

  const { slug } = await ctx.params;
  const sp = new URL(request.url).searchParams;
  const firstName = cleanFirstName(sp.get("firstName"));
  const download = sp.get("download") === "1";

  const { data: comedian, error } = await supabase
    .from("comedians")
    .select("id, name, slug, photo_url")
    .eq("slug", slug.slice(0, 200))
    .maybeSingle();
  if (error) console.error("social image comedian", error.message);
  if (!comedian) return new Response("Comedian not found", { status: 404, headers: { "cache-control": "no-store" } });

  const [{ fonts, logo }, photo] = await Promise.all([socialAssets(), photoDataUrl(comedian.photo_url)]);

  if (download) {
    // Activity log (best effort: a missing log never blocks the download).
    const { data: logged, error: logError } = await supabase.rpc("admin_log_social_image", {
      p_comedian_id: comedian.id,
      p_template: "comedian_feature",
      p_first_name: firstName || null,
    });
    if (logError || logged !== "ok") console.error("admin_log_social_image", logError?.message ?? logged);
  }

  const headers: Record<string, string> = { "cache-control": "private, no-store" };
  if (download) headers["content-disposition"] = `attachment; filename="${featureFileName(comedian.slug)}"`;

  return new ImageResponse(<ComedianFeature name={comedian.name} firstName={firstName} photo={photo} logo={logo} />, {
    ...FEATURE_SIZE,
    fonts,
    headers,
  });
}
