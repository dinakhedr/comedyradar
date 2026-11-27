import { MicIcon } from "./icons";
import { PosterFill } from "./poster-fill";

/** Purple placeholder with the mic icon, used until real photos exist. */
export function PlaceholderImage({
  label,
  className = "",
  iconSize = 56,
  tone = "deep",
}: {
  label?: string;
  className?: string;
  iconSize?: number;
  tone?: "deep" | "purple";
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-lavender-text ${
        tone === "deep" ? "bg-plum-deep" : "bg-radar-purple"
      } ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <MicIcon size={iconSize} />
    </div>
  );
}

/** Shows the image when there is one, otherwise the placeholder. */
export function CoverImage({
  src,
  alt,
  className = "",
  iconSize,
  tone,
}: {
  src: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
  tone?: "deep" | "purple";
}) {
  if (!src) return <PlaceholderImage className={className} iconSize={iconSize} tone={tone} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- posters come from Supabase Storage
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  );
}

/**
 * A show or tour poster in a card, Spotlight or banner (Dina, 2026-11-27):
 * a wide poster fills the box; a tall one is shown whole in the middle with a
 * soft blurred copy of itself around it, so its title and date are never cut.
 * `phoneCrop` always fills small square phone thumbnails (from md up the rule above applies).
 * With no poster it shows `fallback` (for example the owner's photo) or the placeholder.
 */
export function PosterImage({
  src,
  alt,
  className = "",
  iconSize,
  tone,
  fallback = null,
  phoneCrop = false,
  eager = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
  tone?: "deep" | "purple";
  fallback?: string | null;
  phoneCrop?: boolean;
  eager?: boolean;
}) {
  if (!src) return <CoverImage src={fallback} alt={alt} className={className} iconSize={iconSize} tone={tone} />;
  return <PosterFill src={src} alt={alt} className={className} phoneCrop={phoneCrop} eager={eager} />;
}
