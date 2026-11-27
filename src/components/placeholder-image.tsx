import { MicIcon } from "./icons";

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
 * A poster shown whole, never cropped (Dina, 2026-11-27): it sits in the middle
 * of the box and any space left over shows a soft blurred copy of itself. So a
 * tall poster in a wide box (or the other way round) keeps its title and date.
 * `phoneCrop` fills small square phone thumbnails instead (from md up it is whole).
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
  return (
    <div className={`relative overflow-hidden bg-radar-plum ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- posters come from Supabase Storage */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading={eager ? undefined : "lazy"}
        className={`absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-75 ${phoneCrop ? "hidden md:block" : ""}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- posters come from Supabase Storage */}
      <img
        src={src}
        alt={alt}
        loading={eager ? undefined : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        className={`absolute inset-0 h-full w-full ${phoneCrop ? "object-cover md:object-contain" : "object-contain"}`}
      />
    </div>
  );
}
