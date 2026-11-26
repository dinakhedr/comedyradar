import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth-forms";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change", "magiclink"];

/**
 * Where the links in Supabase emails land (confirm email, reset password).
 * Works with the default email templates (?code=…) and with token_hash links.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  const to = new URL(ok ? next : "/signin?error=link", url.origin);
  if (ok && to.pathname === "/dashboard") to.searchParams.set("welcome", "1");
  return NextResponse.redirect(to);
}
