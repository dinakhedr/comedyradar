"use client";

import { useEffect, useRef, useState } from "react";
import { posterFits } from "@/lib/posters";

/**
 * The picture part of PosterImage. Starts filling the box (most posters are wide);
 * once the poster has loaded, a tall or square one switches to "whole, with a
 * blurred fill" so nothing important is cut.
 */
export function PosterFill({
  src,
  alt,
  className,
  phoneCrop,
  eager,
}: {
  src: string;
  alt: string;
  className: string;
  phoneCrop: boolean;
  eager: boolean;
}) {
  const img = useRef<HTMLImageElement>(null);
  const [whole, setWhole] = useState(false);
  const check = (el: HTMLImageElement | null) => {
    if (el && el.naturalWidth > 0) setWhole(!posterFits(el.naturalWidth, el.naturalHeight));
  };
  // The poster may have loaded before this page became interactive.
  useEffect(() => {
    if (img.current?.complete) check(img.current);
  }, [src]);

  const fit = !whole ? "object-cover" : phoneCrop ? "object-cover md:object-contain" : "object-contain";
  return (
    <div className={`relative overflow-hidden bg-radar-plum ${className}`}>
      {whole && (
        // eslint-disable-next-line @next/next/no-img-element -- posters come from Supabase Storage
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-75 ${phoneCrop ? "hidden md:block" : ""}`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- posters come from Supabase Storage */}
      <img
        ref={img}
        src={src}
        alt={alt}
        loading={eager ? undefined : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        onLoad={(e) => check(e.currentTarget)}
        className={`absolute inset-0 h-full w-full ${fit}`}
      />
    </div>
  );
}
