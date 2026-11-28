"use client";

import { useEffect, useMemo, useState } from "react";
import { inputCls, labelCls } from "@/components/auth/field-classes";
import { card, outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { CopyIcon, DownloadIcon, MicLineIcon } from "@/components/icons";
import { ErrorNote, SuccessNote } from "@/components/status-note";
import type { SocialComedian } from "@/lib/data/admin";
import { cleanFirstName, splitName } from "@/lib/social/text";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, "").replace(/\s+/g, " ").trim();

function imageUrl(slug: string, firstName: string, defaultFirst: string, download = false) {
  const u = new URLSearchParams();
  const f = cleanFirstName(firstName);
  if (f && f !== defaultFirst) u.set("firstName", f);
  if (download) u.set("download", "1");
  const qs = u.toString();
  return `/api/admin/social/comedian-feature/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}

/**
 * Social images page: pick a comedian, change the first name used in the
 * yellow band, see the image, download the PNG or copy its link.
 */
export function SocialImages({ comedians, initialSlug }: { comedians: SocialComedian[]; initialSlug: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const picked = comedians.find((c) => c.slug === slug) ?? null;
  const defaultFirst = picked ? splitName(picked.name).first : "";
  const [firstName, setFirstName] = useState(defaultFirst);
  const [debounced, setDebounced] = useState(defaultFirst);
  const [q, setQ] = useState("");
  const [loadedSrc, setLoadedSrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");
  const [copied, setCopied] = useState(0);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(firstName), 400);
    return () => clearTimeout(t);
  }, [firstName]);

  const matches = useMemo(() => {
    const n = norm(q);
    if (!n) return comedians;
    return comedians.filter((c) => norm(c.name).includes(n) || (c.name_ar ? norm(c.name_ar).includes(n) : false));
  }, [q, comedians]);

  const preview = picked ? imageUrl(picked.slug, debounced, defaultFirst) : "";
  const download = picked ? imageUrl(picked.slug, firstName, defaultFirst, true) : "";

  const failed = Boolean(preview) && failedSrc === preview;
  const loading = Boolean(preview) && loadedSrc !== preview && !failed;

  function pick(c: SocialComedian) {
    const first = splitName(c.name).first;
    setSlug(c.slug);
    setFirstName(first);
    setDebounced(first);
    setCopied(0);
    setCopyFailed(false);
    window.history.replaceState(window.history.state, "", `/admin/social?slug=${encodeURIComponent(c.slug)}`);
  }

  async function copyLink() {
    if (!picked) return;
    try {
      await navigator.clipboard.writeText(new URL(imageUrl(picked.slug, firstName, defaultFirst), window.location.origin).toString());
      setCopyFailed(false);
      setCopied((n) => n + 1);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] xl:items-start">
      <section aria-labelledby="pick" className={`${card} flex min-w-0 flex-col gap-4`}>
        <h2 id="pick" className="text-heading font-extrabold">
          1. Pick a comedian
        </h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="social-q" className={labelCls}>
            Search
          </label>
          <input id="social-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="English or Arabic name" autoComplete="off" className={`${inputCls} min-h-11`} />
        </div>
        {comedians.length === 0 ? (
          <p className="text-radar-purple/80">No comedians yet.</p>
        ) : matches.length === 0 ? (
          <p className="text-radar-purple/80">No comedians match &ldquo;{q}&rdquo;.</p>
        ) : (
          <ul aria-label="Comedians" className="-mx-2 flex max-h-[420px] flex-col overflow-y-auto">
            {matches.map((c) => {
              const on = c.slug === slug;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    aria-pressed={on}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-button px-2 py-1.5 text-left ${on ? "bg-spotlight-yellow" : "hover:bg-lavender"}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-lavender text-radar-purple/45">
                      {c.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- photos come from Supabase Storage
                        <img src={c.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <MicLineIcon size={18} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold break-words">{c.name}</span>
                      {c.name_ar && (
                        <span dir="rtl" lang="ar" className="block text-left text-xs text-radar-purple/70">
                          {c.name_ar}
                        </span>
                      )}
                    </span>
                    {!c.photo_url && <span className="shrink-0 text-xs font-bold text-radar-purple/70">No photo</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="make" className={`${card} flex min-w-0 flex-col gap-4 xl:sticky xl:top-6`}>
        <h2 id="make" className="text-heading font-extrabold">
          2. Comedian Feature image
        </h2>
        {!picked ? (
          <p className="text-radar-purple/80">Pick a comedian to see the image.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="social-first" className={labelCls}>
                First name for the CTA
              </label>
              <input
                id="social-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={40}
                autoComplete="off"
                className={`${inputCls} min-h-11`}
              />
              <p className="text-xs text-radar-purple/70">
                Shown big on the image and in &ldquo;Find &hellip;&rsquo;s shows&rdquo;. The last name stays &ldquo;{splitName(picked.name).last || "none"}&rdquo;.
              </p>
            </div>

            <div className="relative mx-auto aspect-[1080/1350] w-full max-w-[400px] overflow-hidden rounded-button bg-radar-purple">
              {/* eslint-disable-next-line @next/next/no-img-element -- the generated PNG */}
              <img
                key={preview}
                src={preview}
                alt={`Comedian Feature image for ${picked.name}`}
                width={1080}
                height={1350}
                onLoad={() => setLoadedSrc(preview)}
                onError={() => setFailedSrc(preview)}
                className="h-full w-full"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-radar-purple/70 text-sm font-bold text-white" aria-live="polite">
                  Making the image&hellip;
                </div>
              )}
            </div>
            {failed && <ErrorNote>The image could not be made. Please try again.</ErrorNote>}
            {!picked.photo_url && <p className="text-sm text-radar-purple/75">This comedian has no photo yet, so the circle shows a placeholder.</p>}

            <div className="flex flex-wrap items-center gap-2">
              <a href={download} className={yellowBtn}>
                <DownloadIcon />
                Download PNG
              </a>
              <button type="button" onClick={copyLink} className={outlineBtn}>
                <CopyIcon />
                Copy image link
              </button>
            </div>
            {copied > 0 && <SuccessNote key={copied}>Link copied. It opens only for you (super admin, signed in).</SuccessNote>}
            {copyFailed && <ErrorNote>Could not copy. Open the image and copy the address instead.</ErrorNote>}
          </>
        )}
      </section>
    </div>
  );
}
