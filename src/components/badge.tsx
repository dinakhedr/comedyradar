import type { PillIcon } from "@/lib/show-display";

export type BadgeTone = "pink" | "yellow" | "purple" | "plum" | "outline" | "white";

const tones: Record<BadgeTone, string> = {
  pink: "bg-laugh-pink text-radar-purple font-extrabold",
  yellow: "bg-spotlight-yellow text-radar-purple font-extrabold",
  purple: "bg-radar-purple text-white font-bold",
  plum: "bg-radar-plum text-white font-bold",
  outline: "border border-plum-line text-white font-bold",
  white: "bg-white text-radar-purple font-extrabold",
};

export function Badge({ tone, children, size = "sm" }: { tone: BadgeTone; children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-block rounded-md tracking-wider uppercase ${tones[tone]} ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-[3px] text-[11px]"
      }`}
    >
      {children}
    </span>
  );
}

/** 12px line icons for card pills. */
const PILL_PATHS: Record<PillIcon, React.ReactNode> = {
  new: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />,
  strong: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 3" />,
  fading: <path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 18M17 3c0 6-10 6-10 18" />,
  soldout: <path d="M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM9 12h6" />,
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1.5 6 4.5" />
    </>
  ),
  lineup: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1.5 6 4.5" />
    </>
  ),
  visiting: <path d="M2 16l20-6-3-2-6 2-6-5-2 1 4 5-4 1-2-1-1 1z" />,
  tour: <path d="M2 16l20-6-3-2-6 2-6-5-2 1 4 5-4 1-2-1-1 1z" />,
  place: (
    <>
      <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  solo: <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4" />,
};

/**
 * The small pill that sits on a show photo: an icon and a short word
 * (NEW, STRONG, SOLD OUT, UAE…). Dina, 2026-11-27.
 */
export function CardPill({
  tone,
  icon,
  children,
  tiny = false,
  large = false,
}: {
  tone: BadgeTone;
  icon?: PillIcon;
  children: React.ReactNode;
  tiny?: boolean;
  /** Show page header size: no shadow, a little bigger. */
  large?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full tracking-wider whitespace-nowrap uppercase ${tones[tone]} ${
        large
          ? "gap-1.5 py-1 pr-3 pl-2 text-xs"
          : `gap-1 shadow-[0_1px_4px_rgba(0,0,0,0.35)] ${tiny ? "py-0.5 pr-1.5 pl-1 text-[9px]" : "py-[3px] pr-2 pl-1.5 text-[10.5px]"}`
      }`}
    >
      {icon && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`shrink-0 ${large ? "h-3.5 w-3.5" : tiny ? "h-2.5 w-2.5" : "h-3 w-3"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {PILL_PATHS[icon]}
        </svg>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
