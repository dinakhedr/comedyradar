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
