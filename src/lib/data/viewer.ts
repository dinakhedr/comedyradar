import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** What the public header needs to know about the person looking at the page. */
export type Viewer = {
  name: string;
  isSuperAdmin: boolean;
};

/**
 * The signed-in account for the public site's header, or null when nobody is
 * signed in. Unlike requireAccount it never redirects, so public pages can use it.
 * It reads the session cookie, so it must render inside a <Suspense>.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  await cookies(); // per visitor, even on a build without Supabase settings
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: row } = await supabase
    .from("accounts")
    .select("display_name, is_super_admin, is_suspended")
    .eq("id", claims.sub)
    .maybeSingle();
  const email = typeof claims.email === "string" ? claims.email : "";
  return {
    name: row?.display_name || email || "My account",
    isSuperAdmin: Boolean(row?.is_super_admin && !row?.is_suspended),
  };
});
