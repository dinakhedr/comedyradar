"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";
import { NAV_LINKS } from "./nav-links";

/** Mobile: menu button that opens the navigation as a full-width panel. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="relative z-50 flex h-11 w-11 items-center justify-center rounded-button bg-spotlight-yellow text-radar-purple"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="fixed inset-x-0 top-0 z-40 flex min-h-dvh flex-col gap-2 bg-radar-purple px-[18px] pt-24 pb-10"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-radar-plum py-4 font-display text-[32px] hover:text-spotlight-yellow"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/signin"
            onClick={() => setOpen(false)}
            className="mt-6 flex min-h-12 items-center justify-center rounded-button bg-spotlight-yellow text-base font-extrabold text-radar-purple"
          >
            Sign in
          </Link>
        </nav>
      )}
    </div>
  );
}
