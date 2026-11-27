"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "./submit-button";
import { ChevronDown } from "./icons";

/** First letter of the name, for the round avatar. */
export function initialOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/**
 * Public header, signed in (spec 7: "avatar menu → Dashboard, Sign out"):
 * a round letter avatar that opens Dashboard, Admin panel (super admin only)
 * and Sign out.
 */
export function AccountMenu({ name, isSuperAdmin }: { name: string; isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const item = "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] font-bold hover:bg-lavender";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-1.5 rounded-button pr-1 text-white hover:text-spotlight-yellow"
      >
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-spotlight-yellow text-lg font-extrabold text-radar-purple">
          {initialOf(name)}
        </span>
        <span className="sr-only">Your account: {name}</span>
        <ChevronDown />
      </button>
      {open && (
        <div id="account-menu" role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-card bg-white p-2 text-radar-purple shadow-lg">
          <p className="truncate border-b border-radar-purple/10 px-3 pt-1 pb-2 text-sm">
            Signed in as <strong>{name}</strong>
          </p>
          <Link role="menuitem" href="/dashboard" onClick={() => setOpen(false)} className={`${item} mt-1`}>
            Dashboard
          </Link>
          {isSuperAdmin && (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className={item}>
              Admin panel
            </Link>
          )}
          <form action={signOut}>
            <SubmitButton role="menuitem" className={item}>
              Sign out
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
