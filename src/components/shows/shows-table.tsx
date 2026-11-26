"use client";

import Link from "next/link";
import { useState } from "react";
import { updateShowStatus } from "@/app/actions/shows";
import { setShowsTour } from "@/app/actions/tours";
import { CopyIcon, EditIcon, ExternalIcon, SoldOutIcon, TicketIcon } from "@/components/icons";
import { outlineBtn } from "@/components/dashboard/ui";
import { SHOW_STATUS_LABELS } from "@/lib/dashboard";
import type { ListedShow } from "@/lib/data/my-shows";
import { formatShowDate } from "@/lib/dates";
import { ShowStatusPill } from "@/components/status";
import { SubmitButton } from "@/components/submit-button";
import { LinkPending } from "@/components/link-pending";

/** The dashboard Shows table with bulk select and row actions (spec 11.4 item 9). */

const SIGNALS: Record<string, string> = { new: "New", strong: "Strong", fading: "Fading", none: "None" };
/** Square icon buttons; the label is read out and shown as a tooltip. */
const iconBtn = "inline-flex h-11 w-11 items-center justify-center rounded-button text-radar-purple hover:bg-lavender focus-visible:outline-2 focus-visible:outline-radar-purple";

export function ShowsTable({ shows, past, tours }: { shows: ListedShow[]; past: boolean; tours: { id: string; name: string }[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [tour, setTour] = useState("");
  const done = () => {
    setPicked(new Set());
    setConfirm(false);
    setTour("");
  };
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
            done();
          }}
          className="flex flex-wrap items-center gap-3 rounded-card bg-lavender px-3 py-2"
        >
          <span className="text-sm font-extrabold" aria-live="polite">
            {picked.size === 0 ? "Tick shows to change several at once." : picked.size === 1 ? "1 show selected" : `${picked.size} shows selected`}
          </span>
          {[...picked].map((id) => (
            <input key={id} type="hidden" name="show_ids" value={id} />
          ))}
          <SubmitButton name="action" value="sold_out" disabled={!picked.size} className={`${outlineBtn} bg-white`}>
            Mark sold out
          </SubmitButton>
          {tours.length > 0 && (
            <span className="flex flex-wrap items-center gap-2">
              <label htmlFor="bulk-tour" className="sr-only">
                Tour
              </label>
              <select id="bulk-tour" name="tour_id" value={tour} onChange={(e) => setTour(e.target.value)} className="min-h-11 rounded-button border-2 border-radar-purple/25 bg-white px-3 text-[15px] font-bold">
                <option value="">Choose a tour</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="none">Not on a tour</option>
              </select>
              <SubmitButton
                formAction={async (f) => {
                  await setShowsTour(f);
                  done();
                }}
                disabled={!picked.size || !tour}
                className={`${outlineBtn} bg-white`}
              >
                {tour === "none" ? "Take off the tour" : "Add to the tour"}
              </SubmitButton>
            </span>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="confirm_cancel" value="yes" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="h-5 w-5 accent-radar-purple" />
            Yes, cancel them
          </label>
          <SubmitButton name="action" value="cancel" disabled={!picked.size || !confirm} className={`${outlineBtn} bg-white`}>
            Cancel shows
          </SubmitButton>
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
                    <ShowStatusPill status={s.status} label={SHOW_STATUS_LABELS[s.status]} />
                  </td>
                  <td className="py-3 pr-3">
                    {SIGNALS[s.signal] ?? s.signal}
                    {s.signal_request && <span className="block text-xs text-radar-purple/70">Asked: {SIGNALS[s.signal_request] ?? s.signal_request}</span>}
                  </td>
                  <td className="py-3 pr-3 text-right font-bold">{s.clicks}</td>
                  <td className="py-3">
                    <div className="-mt-2.5 flex items-center gap-1">
                      <Link href={`/dashboard/shows/${s.id}/edit`} className={iconBtn} aria-label={`Edit ${s.title}`} title="Edit">
                        <LinkPending><EditIcon /></LinkPending>
                      </Link>
                      <Link href={`/dashboard/shows/new?from=${s.id}`} className={iconBtn} aria-label={`Duplicate ${s.title}`} title="Duplicate">
                        <CopyIcon />
                      </Link>
                      {(s.status === "published" || s.status === "sold_out") && !past && (
                        <form action={updateShowStatus} className="contents">
                          <input type="hidden" name="show_ids" value={s.id} />
                          {s.status === "published" ? (
                            <SubmitButton name="action" value="sold_out" className={iconBtn} aria-label={`Mark ${s.title} sold out`} title="Mark sold out">
                              <SoldOutIcon />
                            </SubmitButton>
                          ) : (
                            <SubmitButton name="action" value="on_sale" className={iconBtn} aria-label={`Put ${s.title} back on sale`} title="Back on sale">
                              <TicketIcon />
                            </SubmitButton>
                          )}
                        </form>
                      )}
                      {live && (
                        <Link href={`/shows/${s.slug}`} className={iconBtn} aria-label={`View the public page of ${s.title}`} title="View page">
                          <ExternalIcon />
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
