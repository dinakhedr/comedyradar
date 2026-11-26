import type { ReactNode } from "react";
import { AlertIcon, SaveIcon } from "@/components/icons";

/**
 * Success and error messages: plain bold text with a small icon, never a pill,
 * banner or coloured box (Dina, 2026-11-26). Green with a tick for success,
 * red with a circled "!" for errors. Both colours pass contrast on white and lavender.
 */
export const okGreen = "text-[#157a3f]";
export const errRed = "text-[#d12a1f]";

type NoteProps = { children?: ReactNode; className?: string };

function Note({ ok, children, className = "" }: NoteProps & { ok: boolean }) {
  const Icon = ok ? SaveIcon : AlertIcon;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-1.5 text-base font-bold ${ok ? okGreen : errRed} ${className}`}
    >
      <Icon size={18} className="mt-[3px] shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}

export function SuccessNote(props: NoteProps) {
  return <Note ok {...props} />;
}

export function ErrorNote(props: NoteProps) {
  return <Note ok={false} {...props} />;
}
