"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";
import type { Viewer } from "@/lib/data/viewer";
import { CloseIcon, MenuIcon } from "./icons";
import { SubmitButton } from "./submit-button";
import { NAV_LINKS } from "./nav-links";

/**
 * Mobile: menu button that opens the navigation as a full-width panel.
 * Signed out it ends with Sign in; signed in with Dashboard, Admin panel
 * (super admin only) and Sign out.
 */
export function MobileMenu({ viewer }: { viewer: Viewer | null }) {
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
          {viewer ? (
            <>
              <p className="mt-6 truncate text-sm text-lavender-text">
                Signed in as <strong className="text-white">{viewer.name}</strong>
              </p>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-center rounded-button bg-spotlight-yellow text-base font-extrabold text-radar-purple"
              >
                Dashboard
              </Link>
              {viewer.isSuperAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center justify-center rounded-button bg-stage-black text-base font-extrabold text-white"
                >
                  Admin panel
                </Link>
              )}
              <form action={signOut}>
                <SubmitButton className="flex min-h-12 w-full items-center justify-center gap-2 rounded-button border-2 border-plum-line text-base font-extrabold text-white">
                  Sign out
                </SubmitButton>
              </form>
            </>
          ) : (
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              className="mt-6 flex min-h-12 items-center justify-center rounded-button bg-spotlight-yellow text-base font-extrabold text-radar-purple"
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
