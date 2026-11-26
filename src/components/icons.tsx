type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function ChevronLeft({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M15 5 L8 12 L15 19" />
    </svg>
  );
}

export function ChevronRight({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 5 L16 12 L9 19" />
    </svg>
  );
}

export function ChevronDown({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  );
}

export function SearchIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20 L16.2 16.2" />
    </svg>
  );
}

export function MenuIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
    </svg>
  );
}

export function CloseIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </svg>
  );
}

export function InstagramIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function MailIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7 L12 13 L20 7" />
    </svg>
  );
}

/** The retro stage microphone, used on image placeholders. */
export function MicIcon({ className, size = 64 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <rect x="24" y="11" width="16" height="27" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="22" y="23.5" width="20" height="3.5" rx="1.7" fill="#FF4D8D" />
      <path d="M32 38 V51" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 55 Q32 49 42 55" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
