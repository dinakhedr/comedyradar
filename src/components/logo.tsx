import Link from "next/link";

/**
 * The primary logo (horizontal, dark version) from public/brand.
 * Minimum width is 140px (brand rules).
 */
export function Logo({ className = "w-[150px] md:w-[172px]" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Comedy Radar home" className="inline-flex shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
      <img
        src="/brand/logos/comedy-radar-horizontal-dark.svg"
        alt="Comedy Radar"
        width={495}
        height={230}
        className={`h-auto ${className}`}
      />
    </Link>
  );
}
