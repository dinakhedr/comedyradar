import type { ReactNode } from "react";

/** Square outline icon button used for links and Share on public pages (44×44 tap area). */
export const ICON_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button border-2 border-plum-line hover:border-spotlight-yellow hover:text-spotlight-yellow focus-visible:border-spotlight-yellow";

/** An outside link shown as an icon; the name is the tooltip and the screen-reader label. */
export function IconLink({ href, label, children, className = ICON_BTN }: { href: string; label: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" aria-label={label} title={label} className={className}>
      {children}
    </a>
  );
}
