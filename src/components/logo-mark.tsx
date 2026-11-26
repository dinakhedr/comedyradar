/** The mic and radar arcs from the Comedy Radar logo (public/brand/icons/comedy-radar-mark-dark.svg), without its background. */
export function LogoMark({
  size = 96,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 60"
      width={size}
      height={(size * 60) / 64}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g fill="none" strokeLinecap="round" strokeWidth="4">
        <path d="M20.5 18.9 A13 13 0 0 0 20.5 31.1" stroke="#FFD60A" />
        <path d="M43.5 18.9 A13 13 0 0 1 43.5 31.1" stroke="#FFD60A" />
        <path d="M16.2 12.7 A20 20 0 0 0 16.2 37.3" stroke="#FF4D8D" />
        <path d="M47.8 12.7 A20 20 0 0 1 47.8 37.3" stroke="#FF4D8D" />
        <path
          d="M13.2 5.6 A27 27 0 0 0 13.2 44.4"
          stroke="#FF4D8D"
          opacity="0.55"
        />
        <path
          d="M50.8 5.6 A27 27 0 0 1 50.8 44.4"
          stroke="#FF4D8D"
          opacity="0.55"
        />
      </g>
      <rect x="24" y="11" width="16" height="27" rx="8" fill="#FFFFFF" />
      <path
        d="M26 17 H38 M25 21 H39 M25 30 H39 M26 34 H38"
        stroke="#2B0B4F"
        strokeWidth="1.5"
      />
      <rect x="22" y="23.5" width="20" height="3.5" rx="1.7" fill="#FF4D8D" />
      <path
        d="M32 38 V51"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 55 Q32 49 42 55"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
