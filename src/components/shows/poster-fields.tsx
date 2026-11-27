"use client";

import { useEffect, useRef, useState } from "react";
import { errorCls } from "@/components/auth/fields";
import { TALL_GUIDE, WIDE_GUIDE } from "@/lib/posters";

/**
 * The two poster boxes on the show and tour forms (Dina, 2026-11-27):
 * wide (16:9, used everywhere) and tall (4:5, used only on the single page).
 * Both optional; if only one is added the site uses it everywhere, uncropped.
 * Sends `poster` / `poster_tall` files, and `poster_remove` / `poster_tall_remove`
 * when an existing poster is taken off.
 */
export function PosterFields({
  wide,
  tall,
  errors,
  page,
  onChange,
}: {
  wide: string | null;
  tall: string | null;
  errors?: { poster?: string; poster_tall?: string };
  /** "show" or "tour": which single page the tall poster is for. */
  page: "show" | "tour";
  onChange?: (posters: { wide: string | null; tall: string | null }) => void;
}) {
  const [w, setW] = useState(wide);
  const [t, setT] = useState(tall);
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  });
  useEffect(() => {
    report.current?.({ wide: w, tall: t });
  }, [w, t]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-extrabold">Posters</p>
        <p className="text-sm text-radar-purple/75">Add one or both. If you only have one, we fit it everywhere without cutting it.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] sm:items-start">
        <PosterBox
          name="poster"
          label="Wide poster"
          guide={WIDE_GUIDE}
          where="homepage Spotlight, show cards, lists, search and tour banners"
          ratio="aspect-[16/9]"
          url={w}
          setUrl={setW}
          error={errors?.poster}
        />
        <PosterBox
          name="poster_tall"
          label="Tall poster"
          guide={TALL_GUIDE}
          where={`the ${page} page only`}
          ratio="aspect-[4/5]"
          url={t}
          setUrl={setT}
          error={errors?.poster_tall}
        />
      </div>
      <p className="text-sm text-radar-purple/75">Tip: keep the show name and date away from the edges.</p>
    </div>
  );
}

function PosterBox({
  name,
  label,
  guide,
  where,
  ratio,
  url,
  setUrl,
  error,
}: {
  name: string;
  label: string;
  guide: string;
  where: string;
  ratio: string;
  url: string | null;
  setUrl: (v: string | null) => void;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [removed, setRemoved] = useState(false);
  const [over, setOver] = useState(false);
  const id = `${name}-file`;
  const guideId = `${name}-guide`;
  const errId = `${name}-error`;

  useEffect(() => () => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }, [url]);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setRemoved(false);
    setUrl(URL.createObjectURL(f));
  };

  const smallBtn =
    "flex min-h-9 items-center rounded-[10px] bg-white px-3 text-[13px] font-extrabold text-radar-purple shadow-[0_1px_4px_rgba(0,0,0,0.2)] hover:bg-lavender cursor-pointer";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div>
        <label htmlFor={id} className="font-extrabold">
          {label} <span className="text-sm font-bold text-radar-purple/60">(optional)</span>
        </label>
        <p id={guideId} className="text-sm leading-snug text-radar-purple/80">
          <strong className="text-radar-purple">{guide}</strong>
          <br />
          JPG, PNG or WebP, up to 10 MB.
        </p>
      </div>
      <input
        ref={input}
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={error ? `${guideId} ${errId}` : guideId}
        aria-invalid={error ? true : undefined}
        onChange={(ev) => pick(ev.target.files)}
        className="sr-only"
      />
      {removed && <input type="hidden" name={`${name}_remove`} value="1" />}
      {url ? (
        <div className={`relative overflow-hidden rounded-2xl bg-lavender ${ratio}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview or Supabase Storage */}
          <img src={url} alt={`${label} preview`} className="h-full w-full object-cover" />
          <div className="absolute top-2.5 right-2.5 flex gap-1.5">
            <label htmlFor={id} className={smallBtn}>
              Change
            </label>
            <button
              type="button"
              className={smallBtn}
              onClick={() => {
                if (input.current) input.current.value = "";
                setRemoved(true);
                setUrl(null);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(ev) => {
            ev.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(ev) => {
            ev.preventDefault();
            setOver(false);
            if (input.current && ev.dataTransfer.files.length) {
              input.current.files = ev.dataTransfer.files;
              pick(ev.dataTransfer.files);
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center text-[15px] font-bold text-radar-purple/75 ${ratio} ${
            over ? "border-radar-purple bg-lavender" : "border-[#b9a3d8] bg-[#faf7fe] hover:bg-lavender"
          }`}
        >
          <span className="rounded-[10px] border-2 border-radar-purple bg-white px-4 py-2 font-extrabold text-radar-purple">Choose image</span>
          <span>or drop it here</span>
        </label>
      )}
      {error && (
        <p id={errId} className={errorCls}>
          {error}
        </p>
      )}
      <p className="text-[13px] text-radar-purple/75">
        Shown on: <strong className="text-radar-purple">{where}</strong>
      </p>
    </div>
  );
}
