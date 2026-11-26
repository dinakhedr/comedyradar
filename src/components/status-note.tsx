"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AlertIcon, SaveIcon } from "@/components/icons";
import { withoutMessageParams } from "@/lib/message-params";

/**
 * Success and error messages: plain bold text with a small icon, never a pill,
 * banner or coloured box (Dina, 2026-11-26). Green with a tick for success,
 * red with a circled "!" for errors. Both colours pass contrast on white and lavender.
 *
 * They disappear by themselves: success after 4 seconds, errors after 8.
 * When one hides, the message words in the address (?msg=saved and the like)
 * are taken out too, so a refresh does not bring it back.
 * Pass `stay` for a note that describes the page itself (e.g. a suspended account).
 */
export const okGreen = "text-[#157a3f]";
export const errRed = "text-[#d12a1f]";

export const SUCCESS_MS = 4000;
export const ERROR_MS = 8000;
const FADE_MS = 500;

type NoteProps = { children?: ReactNode; className?: string; stay?: boolean };

function Note({ ok, children, className = "", stay = false }: NoteProps & { ok: boolean }) {
  const search = useSearchParams()?.toString() ?? "";
  const [phase, setPhase] = useState<"shown" | "fading" | "gone">("shown");
  const first = useRef(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A new message arrived in the address (same words as before, e.g. a second save): show it again.
    if (!first.current && withoutMessageParams(search) === null) return;
    first.current = false;
    setPhase("shown");
    if (stay) return;
    // Long messages stay a little longer so there is time to read them.
    const ms = Math.max(ok ? SUCCESS_MS : ERROR_MS, (box.current?.textContent?.length ?? 0) * 55);
    const fade = setTimeout(() => setPhase("fading"), ms);
    const gone = setTimeout(() => {
      setPhase("gone");
      const clean = withoutMessageParams(window.location.search);
      if (clean !== null) window.history.replaceState(window.history.state, "", `${window.location.pathname}${clean}${window.location.hash}`);
    }, ms + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [search, ok, stay]);

  if (phase === "gone") return null;
  const Icon = ok ? SaveIcon : AlertIcon;
  const size = /(^|\s)text-(xs|sm|base|lg|xl|\[\d)/.test(className) ? "" : "text-base";
  return (
    <div
      ref={box}
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-1.5 font-bold transition-opacity duration-500 ${size} ${ok ? okGreen : errRed} ${phase === "fading" ? "opacity-0" : "opacity-100"} ${className}`}
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
