"use client";

import { useEffect, useState } from "react";

/**
 * Mobile only: a bar with the date and "Get tickets" that appears once the
 * main ticket button (id `targetId`) has scrolled out of view (spec 6.1).
 */
export function StickyTicketBar({ targetId, dateLine, children }: { targetId: string; dateLine: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      // Show the bar only once the button is above the screen, not before reaching it.
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={`fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-2.5 rounded-[18px] border-2 border-spotlight-yellow bg-radar-plum py-2.5 pr-2.5 pl-4 shadow-lg transition-transform duration-200 md:hidden ${
        show ? "translate-y-0" : "translate-y-[150%]"
      }`}
    >
      <span className="text-[15px] font-extrabold">{dateLine}</span>
      {children}
    </div>
  );
}
