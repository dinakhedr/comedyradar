import Link from "next/link";
import type { Person } from "@/lib/data/show";
import { Badge } from "./badge";
import { CoverImage } from "./placeholder-image";

export function Avatar({ person, ring, size }: { person: Person; ring: "yellow" | "pink"; size: string }) {
  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-full border-[3px] ${ring === "yellow" ? "border-spotlight-yellow" : "border-laugh-pink"} ${size}`}
    >
      <CoverImage src={person.photo_url} alt="" iconSize={28} className="h-full w-full" tone="deep" />
    </span>
  );
}

/**
 * "On stage" / "On this tour": the group card ("View group page") and a
 * circle for each comedian, each linking to their page.
 */
export function LineupCard({ group, comedians }: { group: Person | null; comedians: Person[] }) {
  return (
    <div
      className={`flex flex-col gap-3.5 rounded-[18px] bg-radar-plum p-4 md:rounded-[24px] md:p-6 ${
        group ? "md:grid md:grid-cols-[280px_minmax(0,1fr)] md:items-center md:gap-7" : ""
      }`}
    >
      {group && (
        <div className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-2.5">
          <CoverImage
            src={group.photo_url}
            alt=""
            iconSize={36}
            className="h-16 w-16 shrink-0 rounded-[14px] md:h-[180px] md:w-full md:rounded-[18px]"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Badge tone="yellow">Group</Badge>
              <span className="text-[17px] font-extrabold">{group.name}</span>
            </div>
            <Link href={`/groups/${group.slug}`} className="text-small font-extrabold text-spotlight-yellow hover:text-white">
              View group page ›
            </Link>
          </div>
        </div>
      )}
      {comedians.length > 0 && (
        <ul className="grid grid-cols-3 gap-x-2 gap-y-3.5 sm:grid-cols-4 md:grid-cols-5 md:gap-5">
          {comedians.map((c, i) => (
            <li key={c.id}>
              <Link href={`/comedians/${c.slug}`} className="group flex flex-col items-center gap-1.5 text-center">
                <Avatar person={c} ring={i % 2 === 0 ? "pink" : "yellow"} size="h-[72px] w-[72px] md:h-[88px] md:w-[88px]" />
                <span className="text-[13px] font-extrabold group-hover:text-spotlight-yellow md:text-[15px]">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
