"use client";

import { useEffect, useRef, useState } from "react";
import { PinIcon, UploadIcon } from "@/components/icons";
import { ErrorNote } from "@/components/status-note";
import { LOGO_SIDE, squareCrop } from "@/lib/venue-forms";

const MAX_PICK_BYTES = 20 * 1024 * 1024;

/** Crops a picture to its centre square and shrinks it to LOGO_SIDE, as WebP. */
async function toSquare(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
  const out = Math.min(LOGO_SIDE, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9));
  if (!blob || blob.type !== "image/webp") {
    const png = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!png) throw new Error("no image");
    return new File([png], "logo.png", { type: "image/png" });
  }
  return new File([blob], "logo.webp", { type: "image/webp" });
}

/**
 * "Venue logo" field for the add and edit venue forms: pick a picture, see it
 * as a square at once, or remove the current logo. Sends `logo` (the cropped
 * file) and `remove_logo` with the form.
 */
export function LogoPicker({ id, current, name }: { id: string; current: string | null; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const file = el.files?.[0];
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > MAX_PICK_BYTES) {
      el.value = "";
      setError("Please pick a JPG, PNG or WebP image up to 20 MB.");
      return;
    }
    setBusy(true);
    try {
      const square = await toSquare(file);
      const dt = new DataTransfer();
      dt.items.add(square);
      el.files = dt.files;
      setPreview(URL.createObjectURL(square));
      setRemoved(false);
    } catch {
      el.value = "";
      setError("That image could not be opened. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (input.current) input.current.value = "";
    setPreview(null);
    setRemoved(true);
    setError("");
  }

  const hasNew = preview?.startsWith("blob:");
  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <span id={`${id}-logo-label`} className="text-sm font-extrabold">
        Venue logo (square, optional)
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-2 border-[#cdc4dc] bg-white">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview or Supabase Storage
            <img src={preview} alt={`${name || "Venue"} logo preview`} className="h-full w-full object-cover" />
          ) : (
            <PinIcon size={32} className="text-[#9a8fae]" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`${id}-logo`}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-button border-2 border-radar-purple bg-white px-4 font-extrabold focus-within:outline-2"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-radar-purple border-t-transparent" aria-hidden="true" />
              ) : (
                <UploadIcon size={18} />
              )}
              {busy ? "Preparing…" : preview ? "Change logo" : "Upload logo"}
              <input
                ref={input}
                id={`${id}-logo`}
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={pick}
                aria-describedby={`${id}-logo-hint`}
                className="sr-only"
              />
            </label>
            {preview && (
              <button type="button" onClick={remove} className="min-h-11 font-bold underline">
                Remove
              </button>
            )}
          </div>
          <p id={`${id}-logo-hint`} className="text-[13px] text-radar-purple/70">
            {hasNew
              ? "New logo ready. It is saved when you press Save."
              : removed && current
                ? "The logo will be removed when you press Save."
                : "JPG, PNG or WebP. Square works best; other shapes are cropped to the centre."}
          </p>
        </div>
      </div>
      <input type="hidden" name="remove_logo" value={removed ? "1" : ""} />
      {error && <ErrorNote className="text-sm">{error}</ErrorNote>}
    </div>
  );
}
