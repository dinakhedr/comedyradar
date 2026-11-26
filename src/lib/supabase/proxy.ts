import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Refreshes the Supabase session cookie on every request. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => supabaseResponse.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims():
  // getClaims() refreshes the session when it has expired.
  const { data } = await supabase.auth.getClaims();

  // The creator dashboard needs a signed-in account (pages check again on the server).
  const path = request.nextUrl.pathname;
  if (!data?.claims && (path === "/dashboard" || path.startsWith("/dashboard/"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/signin";
    to.search = "";
    to.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(to);
  }

  return supabaseResponse;
}
