import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { ComedianFeature, FEATURE_SIZE } from "./comedian-feature";

/** Renders the real template to a PNG and checks its size (photo, no photo, long names). */
async function render(name: string, photo: string | null, firstName?: string) {
  const root = process.cwd();
  const font = async (f: string) => {
    const b = await readFile(join(root, "assets/fonts", f));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  };
  const logo = `data:image/svg+xml;base64,${(await readFile(join(root, "public/brand/logos/comedy-radar-horizontal-dark.svg"))).toString("base64")}`;
  const res = new ImageResponse(createElement(ComedianFeature, { name, firstName, photo, logo }), {
    ...FEATURE_SIZE,
    fonts: [
      { name: "Luckiest Guy", data: await font("LuckiestGuy-Regular.ttf"), weight: 400, style: "normal" },
      { name: "Nunito", data: await font("Nunito-Bold.ttf"), weight: 700, style: "normal" },
    ],
  });
  const png = Buffer.from(await res.arrayBuffer());
  if (process.env.SOCIAL_OUT) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(process.env.SOCIAL_OUT, `${name.replace(/\W+/g, "-")}${photo ? "-photo" : ""}.png`), png);
  }
  return png;
}

const size = (png: Buffer) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

// A tiny PNG stands in for a comedian photo (SOCIAL_PHOTO=data:... to try a real one, SOCIAL_OUT=dir to save the PNGs).
const DOT = process.env.SOCIAL_PHOTO ??
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("Comedian Feature image", () => {
  it.each([
    ["Taha Desouky", DOT],
    ["Taha Desouky", null],
    ["Mohamed Abdel Rahman El Sayed", null],
    ["Abbas Ahmed", null],
  ])("renders %s at 1080 × 1350", async (name, photo) => {
    const png = await render(name, photo);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(size(png)).toEqual({ w: 1080, h: 1350 });
  }, 30_000);
});
