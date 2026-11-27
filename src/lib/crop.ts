/**
 * The square crop of a profile photo (comedian photo popup).
 * All numbers are in the photo's own pixels, so the crop does not change when
 * the popup is resized.
 */
export type Crop = { x: number; y: number; size: number };
export type Corner = "nw" | "ne" | "sw" | "se";

/** The smallest square someone can make, as a share of the photo's short side. */
export const MIN_SHARE = 0.15;
/** The saved photo is at most this many pixels wide (and high). */
export const OUTPUT_MAX = 1000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The first square: as big as the photo allows, in the middle. */
export function initialCrop(w: number, h: number): Crop {
  const size = Math.min(w, h);
  return { x: (w - size) / 2, y: (h - size) / 2, size };
}

/** Moves the square by (dx, dy), keeping it inside the photo. */
export function moveCrop(c: Crop, dx: number, dy: number, w: number, h: number): Crop {
  return { size: c.size, x: clamp(c.x + dx, 0, w - c.size), y: clamp(c.y + dy, 0, h - c.size) };
}

/**
 * Resizes the square by dragging one corner to (px, py). The opposite corner
 * stays where it is, and the square stays inside the photo.
 */
export function resizeCrop(c: Crop, corner: Corner, px: number, py: number, w: number, h: number): Crop {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  const ax = west ? c.x + c.size : c.x; // the corner that stays
  const ay = north ? c.y + c.size : c.y;
  const room = Math.min(west ? ax : w - ax, north ? ay : h - ay);
  const min = Math.min(room, Math.min(w, h) * MIN_SHARE);
  const size = clamp(Math.max(Math.abs(px - ax), Math.abs(py - ay)), min, room);
  return { size, x: west ? ax - size : ax, y: north ? ay - size : ay };
}

/** Grows or shrinks the square around its middle (keyboard + and -). */
export function zoomCrop(c: Crop, delta: number, w: number, h: number): Crop {
  const size = clamp(c.size + delta, Math.min(w, h) * MIN_SHARE, Math.min(w, h));
  const cx = c.x + c.size / 2;
  const cy = c.y + c.size / 2;
  return { size, x: clamp(cx - size / 2, 0, w - size), y: clamp(cy - size / 2, 0, h - size) };
}

/** Width and height of the saved photo. */
export const outputSize = (c: Crop) => Math.max(1, Math.round(Math.min(c.size, OUTPUT_MAX)));
