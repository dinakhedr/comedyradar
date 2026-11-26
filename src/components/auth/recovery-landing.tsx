"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Reads the one-time sign-in from the link, then opens Reset password. */
export function RecoveryLanding() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    history.replaceState(null, "", window.location.pathname);
    if (!access_token || !refresh_token || hash.get("type") !== "recovery") {
      router.replace("/signin?error=link");
      return;
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setFailed(true);
        else router.replace("/reset-password");
      });
  }, [router]);

  return (
    <p role="status" className="text-lg font-extrabold">
      {failed
        ? "This link has expired. Ask for a new one from Forgot password."
        : "Opening Reset password…"}
    </p>
  );
}
