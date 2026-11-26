"use client";

import Link from "next/link";
import { useState } from "react";
import { updateShowStatus } from "@/app/actions/shows";
import { outlineBtn, Tag, type Tone } from "@/components/dashboard/ui";
import { SHOW_STATUS_LABELS } from "@/lib/dashboard";
import type { ListedShow } from "@/lib/data/my-shows";
import { formatShowDate } from "@/lib/dates";

/** The dashboard Shows table with bulk select and row actions (spec 11.4 item 9). */

const STATUS_TONE: Record<string, Tone> = { draft: "outline", pending: "pink", published: "yellow", sold_out: "purple", cancelled: "outline" };
const SIGNALS: Record<string, string> = { new: "New", strong: "Strong", fading: "Fading", none: "None" };
const linkCls = "font-extrabold underline";
const actionBtn = "min-h-11 font-extrabold underline disabled:opacity-60";

export function ShowsTable({ shows, past }: { shows: ListedShow[]; past: boolean }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const all = shows.length > 0 && picked.size === shows.length;
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const canBulk = !past && shows.some((s) => s.status !== "cancelled");

  return (
    <div className="flex flex-col gap-3">
      {canBulk && (
        <form
          id="bulk"
          action={async (f) => {
            await updateShowStatus(f);
            setPicked(new Set());
            setConfirm(false);
          }}
          className="flex flex-wrap items-center gap-3 rounded-card bg-lavender px-3 py-2"
        >
          <span className="text-sm font-extrabold" aria-live="polite">
            {picked.size === 0 ? "Tick shows to change several at once." : picked.size === 1 ? "1 show selected" : `${picked.size} shows selected`}
          </span>
          {[...picked].map((id) => (
            <input key={id} type="hidden" name="show_ids" value={id} />
          ))}
          <button name="action" value="sold_out" disabled={!picked.size} className={`${outlineBtn} bg-white`}>
            Mark sold out
          </button>
          <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="confirm_cancel" value="yes" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-5 w-5 accent-radar-purple" />
            Yes, cancel them
          </label>
          <button name="action" value="cancel" disabled={!picked.size || !confirm} className={`${outlineBtn} bg-white`}>
            Cancel shows
          </button>
        </form>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-radar-purple/75">
            <tr className="border-b border-radar-purple/10">
              {canBulk && (
                <th scope="col" className="w-10 py-2 pr-2">
                  <input
                    type="checkbox"
                    aria-label="Select all shows"
                    checked={all}
                    onChange={() => setPicked(all ? new Set() : new Set(shows.filter((s) => s.status !== "cancelled").map((s) => s.id)))}
                    className="h-5 w-5 accent-radar-purple"
                  />
                </th>
              )}
              <th scope="col" className="py-2 pr-3 font-bold">Date</th>
              <th scope="col" className="py-2 pr-3 font-bold">Show and venue</th>
              <th scope="col" className="py-2 pr-3 font-bold">Performer</th>
              <th scope="col" className="py-2 pr-3 font-bold">Tour</th>
              <th scope="col" className="py-2 pr-3 font-bold">Status</th>
              <th scope="col" className="py-2 pr-3 font-bold">Signal</th>
              <th scope="col" className="py-2 pr-3 text-right font-bold">Ticket clicks</th>
              <th scope="col" className="py-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shows.map((s) => {
              const live = s.status === "published" || s.status === "sold_out";
              return (
                <tr key={s.id} className="border-b border-radar-purple/10 align-top last:border-0">
                  {canBulk && (
                    <td className="py-3 pr-2">
                      {s.status !== "cancelled" && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${s.title}`}
                          checked={picked.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="h-5 w-5 accent-radar-purple"
                        />
                      )}
                    </td>
                  )}
                  <td className="py-3 pr-3 font-bold whitespace-nowrap">{formatShowDate(new Date(s.starts_at))}</td>
                  <td className="py-3 pr-3">
                    <span className="font-extrabold">{s.title}</span>
                    <span className="block text-radar-purple/70">{[s.venue_name, s.city_name].filter(Boolean).join(" · ") || "Venue to be announced"}</span>
                  </td>
                  <td className="py-3 pr-3">{s.performers.join(", ") || "—"}</td>
                  <td className="py-3 pr-3">{s.tour_name ?? "—"}</td>
                  <td className="py-3 pr-3">
                    <Tag tone={STATUS_TONE[s.status] ?? "outline"}>{SHOW_STATUS_LABELS[s.status] ?? s.status}</Tag>
                  </td>
                  <td className="py-3 pr-3">
                    {SIGNALS[s.signal] ?? s.signal}
                    {s.signal_request && <span className="block text-xs text-radar-purple/70">Asked: {SIGNALS[s.signal_request] ?? s.signal_request}</span>}
                  </td>
                  <td className="py-3 pr-3 text-right font-bold">{s.clicks}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link href={`/dashboard/shows/${s.id}/edit`} className={linkCls}>
                        Edit<span className="sr-only"> {s.title}</span>
                      </Link>
                      <Link href={`/dashboard/shows/new?from=${s.id}`} className={linkCls}>
                        Duplicate<span className="sr-only"> {s.title}</span>
                      </Link>
                      {(s.status === "published" || s.status === "sold_out") && !past && (
                        <form action={updateShowStatus} className="contents">
                          <input type="hidden" name="show_ids" value={s.id} />
                          <button name="action" value={s.status === "published" ? "sold_out" : "on_sale"} className={actionBtn}>
                            {s.status === "published" ? "Mark sold out" : "Back on sale"}
                            <span className="sr-only"> {s.title}</span>
                          </button>
                        </form>
                      )}
                      {live && (
                        <Link href={`/shows/${s.slug}`} className={linkCls}>
                          View page<span className="sr-only"> {s.title}</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
