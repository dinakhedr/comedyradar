import Link from "next/link";
import { CoverImage } from "@/components/placeholder-image";
import { profileStatus, ROLE_LABELS, type ManagedProfile } from "@/lib/dashboard";

/** Shared pieces of the creator dashboard: white cards, tags, profile cards. */

export const card = "rounded-card bg-white p-4 md:p-6";
export const yellowBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-spotlight-yellow px-4 text-[15px] font-extrabold text-radar-purple hover:bg-spotlight-yellow/80 disabled:opacity-70";
export const outlineBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-button border-2 border-radar-purple px-4 text-[15px] font-extrabold text-radar-purple hover:bg-lavender disabled:opacity-70";

const tones = {
  pink: "bg-laugh-pink text-radar-purple",
  yellow: "bg-spotlight-yellow text-radar-purple",
  purple: "bg-radar-purple text-white",
  outline: "border border-radar-purple/30 text-radar-purple",
};
export type Tone = keyof typeof tones;

export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider uppercase ${tones[tone]}`}>{children}</span>;
}

export function ProfileCard({ p }: { p: ManagedProfile }) {
  const status = profileStatus(p);
  const href = p.status === "published" ? `/${p.kind === "group" ? "groups" : "comedians"}/${p.slug}` : null;
  return (
    <li className="flex items-center gap-3 rounded-card border border-radar-purple/10 bg-white p-3">
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
        <CoverImage src={p.photo_url} alt="" iconSize={24} className="h-full w-full" tone="deep" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-extrabold">{p.name}</span>
        <span className="text-sm text-radar-purple/75">
          {p.kind === "group" ? "Group" : "Comedian"} · {ROLE_LABELS[p.role]}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Tag tone={status.tone}>{status.label}</Tag>
          {href && (
            <Link href={href} className="text-sm font-extrabold underline">
              View page
            </Link>
          )}
        </span>
      </span>
    </li>
  );
}
