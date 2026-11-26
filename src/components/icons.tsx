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
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className={className}
    >
      <rect
        x="24"
        y="11"
        width="16"
        height="27"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="22" y="23.5" width="20" height="3.5" rx="1.7" fill="#FF4D8D" />
      <path
        d="M32 38 V51"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 55 Q32 49 42 55"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EditIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M4 20 H8 L19 9 A2.8 2.8 0 0 0 15 5 L4 16 Z" />
      <path d="M13.5 6.5 L17.5 10.5" />
    </svg>
  );
}

export function CopyIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15 H4.5 A1.5 1.5 0 0 1 3 13.5 V4.5 A1.5 1.5 0 0 1 4.5 3 H13.5 A1.5 1.5 0 0 1 15 4.5 V5" />
    </svg>
  );
}

/** A ticket, for "back on sale". */
export function TicketIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path
        d="M3 8 V6 A1 1 0 0 1 4 5 H20 A1 1 0 0 1 21 6 V8 A2.5 2.5 0 0 0 21 13 V15 A1 1 0 0 1 20 16 H4 A1 1 0 0 1 3 15 V13 A2.5 2.5 0 0 0 3 8 Z"
        transform="translate(0 1.5)"
      />
      <path d="M14 6.5 V17.5" strokeDasharray="2 2" />
    </svg>
  );
}

/** A crossed-out ticket, for "mark sold out". */
export function SoldOutIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path
        d="M3 8 V6 A1 1 0 0 1 4 5 H20 A1 1 0 0 1 21 6 V8 A2.5 2.5 0 0 0 21 13 V15 A1 1 0 0 1 20 16 H4 A1 1 0 0 1 3 15 V13 A2.5 2.5 0 0 0 3 8 Z"
        transform="translate(0 1.5)"
      />
      <path d="M4 21 L20 2" />
    </svg>
  );
}

export function ExternalIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M14 4 H20 V10" />
      <path d="M20 4 L11 13" />
      <path d="M18 14 V19 A1 1 0 0 1 17 20 H5 A1 1 0 0 1 4 19 V7 A1 1 0 0 1 5 6 H10" />
    </svg>
  );
}

export function StarIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M12 3.5 L14.6 8.9 L20.5 9.6 L16.1 13.6 L17.3 19.5 L12 16.6 L6.7 19.5 L7.9 13.6 L3.5 9.6 L9.4 8.9 Z" />
    </svg>
  );
}

export function ArrowUpIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 13 L12 6 L19 13" />
      <path d="M12 6 V19" />
    </svg>
  );
}

export function ArrowDownIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 11 L12 18 L19 11" />
      <path d="M12 18 V5" />
    </svg>
  );
}

/** A tick: the Save action on a row or a small form. */
export function SaveIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12.5 L10 17.5 L19 7" />
    </svg>
  );
}

/** A circled "!": shown before an error message. */
export function AlertIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5 V13" />
      <path d="M12 16.5 V16.6" />
    </svg>
  );
}

/* Menu icons for the admin and dashboard sidebars. */

export function HomeIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M4 11 L12 4 L20 11 V20 H14.5 V14.5 H9.5 V20 H4 Z" />
    </svg>
  );
}

/** A clipboard with a tick, for the Review queue. */
export function ClipboardCheckIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5 V3 H15 V4.5" />
      <path d="M8.5 13 L11 15.5 L15.5 10.5" />
    </svg>
  );
}

/** A small line microphone, for Comedians. */
export function MicLineIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11 A6 6 0 0 0 18 11" />
      <path d="M12 17 V21" />
      <path d="M9 21 H15" />
    </svg>
  );
}

/** Two people, for Groups and Team. */
export function PeopleIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20 A6 6 0 0 1 15 20" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2 A5 5 0 0 1 21 19" />
    </svg>
  );
}

/** A folded map, for Tours. */
export function MapIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M9 4 L3 6 V20 L9 18 L15 20 L21 18 V4 L15 6 Z" />
      <path d="M9 4 V18" />
      <path d="M15 6 V20" />
    </svg>
  );
}

export function UploadIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M12 15 V4" />
      <path d="M7 9 L12 4 L17 9" />
      <path d="M4 15 V19 A1 1 0 0 0 5 20 H19 A1 1 0 0 0 20 19 V15" />
    </svg>
  );
}

export function UserIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21 A8 8 0 0 1 20 21" />
    </svg>
  );
}

export function ClockIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7 V12 L15.5 14" />
    </svg>
  );
}

/** Two sliders, for Settings. */
export function SlidersIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M4 7 H13" />
      <path d="M19 7 H20" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M4 17 H5" />
      <path d="M11 17 H20" />
      <circle cx="8" cy="17" r="2.5" />
    </svg>
  );
}

/** An ID card, for Profiles. */
export function IdCardIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5.5 16.5 A3.5 3.5 0 0 1 12.5 16.5" />
      <path d="M15 10 H18" />
      <path d="M15 14 H18" />
    </svg>
  );
}

/** An inbox tray, for Requests. */
export function InboxIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M3 13 H8 L9.5 16 H14.5 L16 13 H21" />
      <path d="M5.5 5 H18.5 L21 13 V19 H3 V13 Z" />
    </svg>
  );
}
