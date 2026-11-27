import { describe, expect, it } from "vitest";
import { initialCrop, moveCrop, outputSize, resizeCrop, zoomCrop } from "./crop";

describe("photo crop", () => {
  it("starts as the biggest square in the middle", () => {
    expect(initialCrop(400, 300)).toEqual({ x: 50, y: 0, size: 300 });
    expect(initialCrop(300, 500)).toEqual({ x: 0, y: 100, size: 300 });
  });

  it("moves but never leaves the photo", () => {
    const c = { x: 50, y: 0, size: 200 };
    expect(moveCrop(c, 30, 40, 400, 300)).toEqual({ x: 80, y: 40, size: 200 });
    expect(moveCrop(c, 999, 999, 400, 300)).toEqual({ x: 200, y: 100, size: 200 });
    expect(moveCrop(c, -999, -999, 400, 300)).toEqual({ x: 0, y: 0, size: 200 });
  });

  it("resizes from a corner and keeps the opposite corner still", () => {
    const c = { x: 100, y: 100, size: 100 };
    // Dragging the bottom-right corner out: the top-left stays at (100, 100).
    expect(resizeCrop(c, "se", 250, 220, 400, 300)).toEqual({ x: 100, y: 100, size: 150 });
    // Dragging the top-left corner in: the bottom-right stays at (200, 200).
    expect(resizeCrop(c, "nw", 150, 140, 400, 300)).toEqual({ x: 140, y: 140, size: 60 });
  });

  it("stops at the edge of the photo and at the smallest size", () => {
    const c = { x: 100, y: 100, size: 100 };
    expect(resizeCrop(c, "se", 999, 999, 400, 300)).toEqual({ x: 100, y: 100, size: 200 });
    expect(resizeCrop(c, "ne", 101, 199, 400, 300).size).toBe(45); // 15% of 300
  });

  it("zooms around the middle", () => {
    expect(zoomCrop({ x: 100, y: 100, size: 100 }, 20, 400, 300)).toEqual({ x: 90, y: 90, size: 120 });
    expect(zoomCrop({ x: 0, y: 0, size: 280 }, 100, 400, 300).size).toBe(300);
  });

  it("saves at most 1000 pixels wide", () => {
    expect(outputSize({ x: 0, y: 0, size: 3000 })).toBe(1000);
    expect(outputSize({ x: 0, y: 0, size: 640.4 })).toBe(640);
  });
});
