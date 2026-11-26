"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheckIcon,
  ClockIcon,
  HomeIcon,
  MailIcon,
  MicLineIcon,
  PeopleIcon,
  SlidersIcon,
  StarIcon,
  TicketIcon,
  UploadIcon,
  UserIcon,
} from "@/components/icons";

type Icon = (p: { className?: string; size?: number }) => React.ReactNode;

/** Order: things to check first, then content, then people and setup. */
const ITEMS: { href: string; label: string; icon: Icon; soon?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: HomeIcon },
  { href: "/admin/review", label: "Review queue", icon: ClipboardCheckIcon },
  { href: "/admin/messages", label: "Messages", icon: MailIcon },
  { href: "/admin/comedians", label: "Comedians", icon: MicLineIcon },
  { href: "/admin/groups", label: "Groups", icon: PeopleIcon },
  { href: "/admin/shows", label: "Shows and tours", icon: TicketIcon },
  { href: "/admin/spotlight", label: "Spotlight", icon: StarIcon },
  { href: "/admin/import", label: "Bulk import", icon: UploadIcon },
  { href: "/admin/accounts", label: "Accounts", icon: UserIcon },
  { href: "/admin/activity", label: "Activity log", icon: ClockIcon },
  { href: "/admin/settings", label: "Settings", icon: SlidersIcon },
];

/** Admin menu (spec 11.5): Stage Black, yellow active item. Later parts show "Soon". */
export function AdminNav() {
  const path = usePathname();
  const base = "flex min-h-11 shrink-0 items-center gap-2.5 rounded-button px-3.5 text-[15px] font-bold";
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-[18px] flex min-w-0 gap-1 overflow-x-auto px-[18px] md:mx-0 md:flex-col md:px-0">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        if (item.soon) {
          return (
            <span key={item.href} className={`${base} text-white/55`} aria-disabled="true">
              <item.icon className="shrink-0" />
              {item.label}
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider uppercase">Soon</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${base} ${active ? "bg-spotlight-yellow font-extrabold text-stage-black" : "text-white hover:bg-white/10"}`}
          >
            <item.icon className={`shrink-0 ${active ? "" : "opacity-85"}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
