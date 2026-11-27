"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { errorCls, labelCls } from "@/components/auth/fields";
import { outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { CoverImage } from "@/components/placeholder-image";
import { SuccessNote } from "@/components/status-note";
import { initialCrop, moveCrop, outputSize, resizeCrop, zoomCrop, type Corner, type Crop } from "@/lib/crop";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
// Each corner handle has a 44 px touch area centred on the corner.
const cornerPos: Record<Corner, { style: CSSProperties; cls: string }> = {
  nw: { style: { left: -24, top: -24 }, cls: "cursor-nwse-resize" },
  ne: { style: { right: -24, top: -24 }, cls: "cursor-nesw-resize" },
  sw: { style: { left: -24, bottom: -24 }, cls: "cursor-nesw-resize" },
  se: { style: { right: -24, bottom: -24 }, cls: "cursor-nwse-resize" },
};

type Source = { file: File; url: string; w: number; h: number };
type Saved = { crop: Crop; preview: string; file: File; source: Source };
type Drag = { mode: "move" | Corner; startX: number; startY: number; start: Crop };

/**
 * A profile photo field with a square crop popup (Dina, 2026-11-27): after a
 * photo is picked, a popup lets the person drag a square onto the face and
 * resize it from a corner. The cropped square (at most 1000 px, JPG) replaces
 * the picked file in the form, so the server saves only the crop.
 */
export function PhotoCropField({
  name = "photo",
  label = "Photo",
  optional,
  hint,
  current,
  removable,
  error,
}: {
  name?: string;
  label?: string;
  optional?: boolean;
  hint: string;
  current: string | null;
  removable?: boolean;
  error?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  // The crop that is in the form now (kept when a new pick or "Adjust crop" is cancelled).
  const [saved, setSavedState] = useState<Saved | null>(null);
  const savedRef = useRef<Saved | null>(null);
  const setSaved = (v: Saved) => ((savedRef.current = v), setSavedState(v));
  // Set just before the popup closes after "Use this photo".
  const applied = useRef(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Free the photo memory when the field goes away.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const track = (u: string) => (urls.current.push(u), u);

  function pick(file: File | undefined) {
    setPickError(null);
    if (!file) return;
    if (!TYPES.includes(file.type)) return reject("Please use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return reject("The image is larger than 10 MB.");
    const url = track(URL.createObjectURL(file));
    const img = new Image();
    img.onload = () => {
      setSource({ file, url, w: img.naturalWidth, h: img.naturalHeight });
      setCrop(initialCrop(img.naturalWidth, img.naturalHeight));
      dialog.current?.showModal();
    };
    img.onerror = () => reject("We couldn't open this image. Please try another one.");
    img.src = url;
  }

  /** Puts the form back to what it had before this pick. */
  function reject(message: string) {
    setPickError(message);
    restoreInput();
  }

  function restoreInput() {
    const keep = savedRef.current;
    if (!input.current) return;
    if (!keep) {
      input.current.value = "";
      setSource(null);
      return;
    }
    // Put the earlier crop back in the form (a new pick replaced it).
    const dt = new DataTransfer();
    dt.items.add(keep.file);
    input.current.files = dt.files;
    setSource(keep.source);
  }

  function cancel() {
    dialog.current?.close();
  }

  // Closing with Esc or Cancel: forget the new pick if nothing was saved from it.
  function onClose() {
    if (applied.current) applied.current = false;
    else restoreInput();
  }

  async function applyCrop() {
    if (!source || !crop) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = source.url;
      await img.decode();
      const side = outputSize(crop);
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
      ctx.fillRect(0, 0, side, side);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, side, side);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
      if (!blob || !input.current) throw new Error("no blob");
      const base = source.file.name.replace(/\.[^.]+$/, "") || "photo";
      const file = new File([blob], `${base}-square.jpg`, { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.current.files = dt.files;
      setSaved({ crop, preview: track(URL.createObjectURL(blob)), file, source });
      applied.current = true;
      dialog.current?.close();
    } catch {
      setPickError("We couldn't crop this photo. Please try another one.");
      dialog.current?.close();
    } finally {
      setBusy(false);
    }
  }

  function adjust() {
    if (!saved) return;
    setSource(saved.source);
    setCrop(saved.crop);
    dialog.current?.showModal();
  }

  const shown = saved?.preview ?? current;
  const messages = [pickError, error].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelCls}>
        {label}
        {optional && <span className="font-bold text-radar-purple/70"> (optional)</span>}
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <span className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
          <CoverImage src={shown} alt="" iconSize={28} className="h-full w-full" tone="deep" />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          {saved && <SuccessNote stay>Photo cropped. Save to keep it.</SuccessNote>}
          <div className="flex flex-wrap gap-2">
            {saved && (
              <button type="button" onClick={adjust} className={outlineBtn}>
                Adjust crop
              </button>
            )}
            <button type="button" onClick={() => input.current?.click()} className={outlineBtn}>
              {saved || current ? "Choose another photo" : "Choose a photo"}
            </button>
          </div>
          <p id={`${id}-hint`} className="text-sm text-radar-purple/75">
            {hint}
          </p>
          <input
            ref={input}
            id={id}
            name={name}
            type="file"
            accept={TYPES.join(",")}
            aria-describedby={`${id}-hint`}
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {removable && current && !saved && (
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
              <input type="checkbox" name={`remove_${name}`} className="h-5 w-5 accent-radar-purple" />
              Remove the current photo
            </label>
          )}
        </div>
      </div>
      {messages.map((m) => (
        <p key={m} className={errorCls}>
          {m}
        </p>
      ))}

      <dialog
        ref={dialog}
        onClose={onClose}
        style={{ outline: "none" }}
        aria-labelledby={`${id}-title`}
        className="m-auto w-full max-w-none rounded-t-card bg-white p-4 text-radar-purple outline-none backdrop:bg-stage-black/60 max-sm:mb-0 max-sm:rounded-b-none sm:max-w-[520px] sm:rounded-card sm:p-6"
      >
        {source && crop && (
          <div className="flex flex-col gap-3">
            <h2 id={`${id}-title`} className="text-heading font-extrabold">
              Adjust your photo
            </h2>
            <p className="text-sm text-radar-purple/75">Drag the square onto the face. Drag a corner to make it bigger or smaller.</p>
            <CropStage source={source} crop={crop} onChange={setCrop} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Preview source={source} crop={crop} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={cancel} className={outlineBtn}>
                  Cancel
                </button>
                <button type="button" onClick={applyCrop} disabled={busy} className={yellowBtn}>
                  {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-radar-purple border-t-transparent" />}
                  Use this photo
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

/** The photo with the square on top. Drag the square, or a corner, to change it. */
function CropStage({ source, crop, onChange }: { source: Source; crop: Crop; onChange: (c: Crop) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const drag = useRef<Drag | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Screen pixels per photo pixel.
  const k = width ? width / source.w : 0;

  function down(e: PointerEvent, mode: Drag["mode"]) {
    e.preventDefault();
    e.stopPropagation();
    box.current?.setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: crop };
  }

  function move(e: PointerEvent) {
    const d = drag.current;
    if (!d || !k || !box.current) return;
    if (d.mode === "move") {
      onChange(moveCrop(d.start, (e.clientX - d.startX) / k, (e.clientY - d.startY) / k, source.w, source.h));
    } else {
      const r = box.current.getBoundingClientRect();
      onChange(resizeCrop(d.start, d.mode, (e.clientX - r.left) / k, (e.clientY - r.top) / k, source.w, source.h));
    }
  }

  function up() {
    drag.current = null;
  }

  // Arrow keys move the square, + and - make it bigger or smaller.
  function key(e: KeyboardEvent) {
    const step = Math.max(4, Math.min(source.w, source.h) * (e.shiftKey ? 0.1 : 0.02));
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) onChange(moveCrop(crop, moves[e.key][0], moves[e.key][1], source.w, source.h));
    else if (e.key === "+" || e.key === "=") onChange(zoomCrop(crop, step * 2, source.w, source.h));
    else if (e.key === "-") onChange(zoomCrop(crop, -step * 2, source.w, source.h));
    else return;
    e.preventDefault();
  }

  return (
    <div
      ref={box}
      className="relative mx-auto touch-none select-none"
      style={{ aspectRatio: `${source.w} / ${source.h}`, width: `min(100%, calc(55vh * ${source.w / source.h}))` }}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {/* The photo, darkened outside the square. The handles sit above, so they are never cut off. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden rounded-xl bg-stage-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local photo that is not uploaded yet */}
        <img src={source.url} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
        {k > 0 && (
          <div
            className="absolute shadow-[0_0_0_9999px_rgba(18,18,18,0.55)]"
            style={{ left: crop.x * k, top: crop.y * k, width: crop.size * k, height: crop.size * k }}
          />
        )}
      </div>
      {k > 0 && (
        <div
          role="slider"
          tabIndex={0}
          aria-label="Photo crop square. Arrow keys move it, plus and minus resize it."
          aria-valuenow={Math.round((crop.size / Math.min(source.w, source.h)) * 100)}
          aria-valuemin={15}
          aria-valuemax={100}
          aria-valuetext={`Square covers ${Math.round((crop.size / Math.min(source.w, source.h)) * 100)}% of the photo`}
          onKeyDown={key}
          onPointerDown={(e) => down(e, "move")}
          className="absolute cursor-move border-[3px] border-white outline-none focus-visible:border-spotlight-yellow"
          style={{ left: crop.x * k, top: crop.y * k, width: crop.size * k, height: crop.size * k }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 right-1/3 border-x border-white/50" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 bottom-1/3 border-y border-white/50" />
          {CORNERS.map((c) => (
            <span
              key={c}
              aria-hidden
              onPointerDown={(e) => down(e, c)}
              className={`absolute flex h-11 w-11 items-center justify-center ${cornerPos[c].cls}`}
              style={cornerPos[c].style}
            >
              <span className="h-[18px] w-[18px] rounded-[4px] border-[3px] border-radar-purple bg-white" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The small round "how it will look" preview. */
function Preview({ source, crop }: { source: Source; crop: Crop }) {
  const size = 56;
  const s = size / crop.size;
  return (
    <div className="flex items-center gap-3 text-sm text-radar-purple/75">
      <span
        aria-hidden
        className="h-14 w-14 shrink-0 rounded-full ring-2 ring-lavender"
        style={{
          backgroundImage: `url(${source.url})`,
          backgroundSize: `${source.w * s}px ${source.h * s}px`,
          backgroundPosition: `${-crop.x * s}px ${-crop.y * s}px`,
          backgroundRepeat: "no-repeat",
        }}
      />
      How it will look
    </div>
  );
}
