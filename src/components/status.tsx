import { STATUS_COLORS, STATUS_LABELS, statusKind, type StatusKind } from "@/lib/status";

/**
 * Status pills and icons, used everywhere a status is shown.
 * Pills: tables and grids. Round icons: compact lists (e.g. admin Venues).
 * Colours come from src/lib/status.ts.
 */

/** A status pill. `label` overrides the default word (e.g. "In review" for pending). */
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const k = statusKind(status);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider whitespace-nowrap uppercase ${STATUS_COLORS[k]}`}
    >
      {label ?? STATUS_LABELS[k]}
    </span>
  );
}

function StatusGlyph({ k }: { k: StatusKind }) {
  const p = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (k === "published")
    return (
      <svg {...p} strokeWidth={3.2}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  if (k === "pending")
    return (
      <svg {...p} strokeWidth={2.6}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  if (k === "archived")
    return (
      <svg {...p} width={13} height={13} strokeWidth={2.4}>
        <rect x="3" y="4" width="18" height="5" rx="1" />
        <path d="M5 9v10h14V9M10 13h4" />
      </svg>
    );
  if (k === "rejected")
    return (
      <svg {...p} width={12} height={12} strokeWidth={3.2}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  return (
    <svg {...p} width={12} height={12} strokeWidth={2.6}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </svg>
  );
}

/** A small round status icon; its name shows on hover and keyboard focus. */
export function StatusIcon({ status, label }: { status: string; label?: string }) {
  const k = statusKind(status);
  const name = label ?? STATUS_LABELS[k];
  return (
    <span
      role="img"
      aria-label={name}
      tabIndex={0}
      className={`group/st relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${STATUS_COLORS[k]}`}
    >
      <StatusGlyph k={k} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-radar-purple px-2 py-1 text-xs font-bold whitespace-nowrap text-white group-hover/st:block group-focus/st:block"
      >
        {name}
      </span>
    </span>
  );
}

/** Shows also have Sold out and Cancelled; everything else uses the five status colours. */
const SHOW_EXTRA: Record<string, { label: string; cls: string }> = {
  sold_out: { label: "Sold out", cls: "bg-radar-purple text-white" },
  cancelled: { label: "Cancelled", cls: "bg-laugh-pink text-radar-purple" },
};

/** Status pill for a show or tour date: Published, In review, Draft, Sold out or Cancelled. */
export function ShowStatusPill({ status, label }: { status: string; label?: string }) {
  const extra = SHOW_EXTRA[status];
  if (!extra) return <StatusPill status={status} label={label ?? (statusKind(status) === "pending" ? "In review" : undefined)} />;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider whitespace-nowrap uppercase ${extra.cls}`}>
      {label ?? extra.label}
    </span>
  );
}
