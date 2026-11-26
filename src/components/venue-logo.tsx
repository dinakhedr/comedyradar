import { PinIcon } from "./icons";

/**
 * A venue's square logo, "Clean" style: rounded corners and a soft shadow, no
 * frame (Dina's pick, 2026-11-26). Without a logo: a map pin on dark purple.
 */
export function VenueLogo({ src, name, className = "", pinSize = 40, eager = false }: { src: string | null; name: string; className?: string; pinSize?: number; eager?: boolean }) {
  const box = `aspect-square shrink-0 overflow-hidden rounded-[22px] shadow-[0_12px_28px_rgba(0,0,0,0.45)] ${className}`;
  if (!src) {
    return (
      <div className={`${box} flex items-center justify-center bg-radar-purple text-lavender-text`} aria-hidden="true">
        <PinIcon size={pinSize} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos come from Supabase Storage
    <img src={src} alt={`${name} logo`} loading={eager ? "eager" : "lazy"} className={`${box} bg-white object-cover`} />
  );
}

/** "Sheikh Zayed, Giza" when the venue has an area, else just the city. */
export function venuePlace(area: string | null, city: string) {
  return area ? `${area}, ${city}` : city;
}
