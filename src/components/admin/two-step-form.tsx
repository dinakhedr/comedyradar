"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { errorCls, inputCls, labelCls, primaryBtn } from "@/components/auth/fields";
import { createClient } from "@/lib/supabase/client";

type Setup = { factorId: string; qr: string; secret: string } | null;

/**
 * 2-step verification for the admin panel (spec 11.5): the first time, add
 * an authenticator app with the QR code; after that, type its 6-digit code.
 */
export function TwoStepForm() {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<"loading" | "setup" | "verify">("loading");
  const [factorId, setFactorId] = useState("");
  const [setup, setSetup] = useState<Setup>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) {
        setError("Could not load your 2-step settings. Please reload the page.");
        return;
      }
      const ready = data.totp.find((f) => f.status === "verified");
      if (ready) {
        setFactorId(ready.id);
        setMode("verify");
        return;
      }
      // An app added earlier but never confirmed is removed, then added again.
      for (const f of data.all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: en, error: enErr } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Comedy Radar admin" });
      if (enErr || !en) {
        setError("Could not start the setup. Please reload the page.");
        return;
      }
      setFactorId(en.id);
      setSetup({ factorId: en.id, qr: en.totp.qr_code, secret: en.totp.secret });
      setMode("setup");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) {
      setError("Type the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: vErr } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: clean });
    setBusy(false);
    if (vErr) {
      setError("That code did not work. Codes change every 30 seconds; please try the new one.");
      setCode("");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  if (mode === "loading") return <p aria-busy="true">{error || "Loading…"}</p>;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {mode === "setup" && setup && (
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-[15px]">
          <li>Open an authenticator app on your phone, like Google Authenticator or Microsoft Authenticator.</li>
          <li>
            Add an account and scan this code:
            {/* eslint-disable-next-line @next/next/no-img-element -- a data address made by Supabase */}
            <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="mt-2 rounded-button bg-white p-2" />
            <span className="mt-1 block text-sm">
              Can&apos;t scan? Type this key instead: <code className="font-bold break-all">{setup.secret}</code>
            </span>
          </li>
          <li>Type the 6-digit code the app shows.</li>
        </ol>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className={labelCls}>
          6-digit code
        </label>
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputCls} max-w-48 text-center text-xl tracking-[0.3em]`}
          autoFocus
        />
        {error && (
          <p id={`${id}-err`} className={errorCls}>
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={`${primaryBtn} sm:w-auto`}>
        {busy ? "Checking…" : mode === "setup" ? "Turn on 2-step and open the panel" : "Open the admin panel"}
      </button>
    </form>
  );
}
