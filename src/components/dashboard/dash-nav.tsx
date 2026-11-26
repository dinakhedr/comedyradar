"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, IdCardIcon, InboxIcon, MapIcon, PeopleIcon, StarIcon, TicketIcon } from "@/components/icons";

type Icon = (p: { className?: string; size?: number }) => React.ReactNode;

/** Order: Requests first (they need an answer), then the order people work in. */
const ITEMS: { href: string; label: string; icon: Icon; soon?: boolean; requests?: boolean }[] = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/dashboard/requests", label: "Requests", icon: InboxIcon, requests: true },
  { href: "/dashboard/profiles", label: "Profiles", icon: IdCardIcon },
  { href: "/dashboard/shows", label: "Shows", icon: TicketIcon },
  { href: "/dashboard/tours", label: "Tours", icon: MapIcon },
  { href: "/dashboard/team", label: "Team and access", icon: PeopleIcon },
  { href: "/dashboard/spotlight", label: "Spotlight", icon: StarIcon, soon: true },
];

/** Dashboard menu (spec 11.4 item 3). Pages that come in later parts show "Soon". */
export function DashNav({ requestsCount }: { requestsCount: React.ReactNode }) {
  return <NavList path={usePathname()} requestsCount={requestsCount} />;
}

/** The menu without the current page marked (shown while the address loads on pages with ids in it). */
export function NavList({ path, requestsCount }: { path: string; requestsCount: React.ReactNode }) {
  const base = "relative flex min-h-11 shrink-0 items-center gap-2.5 rounded-button px-3.5 text-[15px] font-bold";
  return (
    <nav aria-label="Dashboard" className="no-scrollbar -mx-[18px] flex min-w-0 gap-1 overflow-x-auto px-[18px] md:mx-0 md:flex-col md:px-0">
      {ITEMS.map((item) => {
        const active = item.href === "/dashboard" ? path === "/dashboard" : path.startsWith(item.href);
        const count = item.requests ? requestsCount : null;
        if (item.soon) {
          return (
            <span key={item.href} className={`${base} text-lavender-text/70`} aria-disabled="true">
              <item.icon className="shrink-0" />
              {item.label}
              {count}
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider uppercase">Soon</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${base} ${active ? "bg-spotlight-yellow font-extrabold text-radar-purple" : "text-white hover:bg-radar-plum"}`}
          >
            <item.icon className={`shrink-0 ${active ? "" : "opacity-85"}`} />
            {item.label}
            {count}
          </Link>
        );
      })}
    </nav>
  );
}
