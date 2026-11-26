"use client";

import { useActionState, useRef, useState } from "react";
import { importComedians, importShows, type ComedianImportState, type ShowImportState } from "@/app/actions/admin-import";
import { card, outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { errText, okText } from "@/lib/venue-forms";

const START_COMEDIANS: ComedianImportState = { step: "start", message: "", ok: true, rows: [], counts: { ready: 0, skip: 0, error: 0 } };
const START_SHOWS: ShowImportState = { step: "start", message: "", ok: true, rows: [], counts: { ready: 0, skip: 0, error: 0 }, createMissing: false };

const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap";
const READY = `${pill} bg-[#1f9d55] text-white`;
const SKIP = `${pill} bg-spotlight-yellow text-radar-purple`;
const th = "px-3 py-2 text-left text-xs font-extrabold tracking-wider text-radar-purple/70 uppercase";
const td = "px-3 py-2.5 align-top text-sm";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The file picker: reads the CSV in the browser and checks it right away. */
function FilePicker({ id, csv, fileName, onRead, onError }: { id: string; csv: string; fileName: string; onRead: (text: string, name: string) => void; onError: (msg: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-extrabold">
        Choose your CSV file
      </label>
      <input
        id={id}
        type="file"
        accept=".csv,text/csv"
        className="block w-full max-w-md text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-button file:border-2 file:border-radar-purple file:bg-white file:px-4 file:font-extrabold file:text-radar-purple hover:file:bg-lavender"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (/\.(xlsx|xls|numbers)$/i.test(file.name)) {
            onError("Please save the sheet as CSV first. In Excel: File > Save As > CSV UTF-8. In Google Sheets: File > Download > CSV.");
            return;
          }
          if (file.size > 900_000) {
            onError("This file is too big. Please split it into smaller files.");
            return;
          }
          onRead(await file.text(), file.name);
        }}
      />
      <input type="hidden" name="csv" value={csv} />
      {fileName && <p className="text-sm text-radar-purple/75">File: {fileName}</p>}
    </div>
  );
}

function Counts({ counts, noun }: { counts: { ready: number; skip: number; error: number }; noun: [string, string] }) {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold">
      <span className="flex items-center gap-1.5">
        <span className={READY}>Ready</span> {plural(counts.ready, noun[0], noun[1])}
      </span>
      {counts.skip > 0 && (
        <span className="flex items-center gap-1.5">
          <span className={SKIP}>Skip</span> {counts.skip} already on the site or twice in the file
        </span>
      )}
      {counts.error > 0 && <span className={errText}>{plural(counts.error, "row", "rows")} to fix</span>}
    </p>
  );
}

function Status({ status, message }: { status: "ready" | "skip" | "error"; message: string }) {
  if (status === "ready") return <span className={READY}>Ready</span>;
  if (status === "skip")
    return (
      <span className="flex flex-col items-start gap-1">
        <span className={SKIP}>Skip</span>
        <span className="text-xs text-radar-purple/75">{message}</span>
      </span>
    );
  return <span className={errText}>{message}</span>;
}

function Templates({ base }: { base: string }) {
  return (
    <p className="text-sm">
      Template:{" "}
      <a href={`/templates/${base}.xlsx`} download className="font-extrabold underline">
        Excel (.xlsx)
      </a>{" "}
      ·{" "}
      <a href={`/templates/${base}.csv`} download className="font-extrabold underline">
        CSV
      </a>{" "}
      <span className="text-radar-purple/75">(the Excel file has a &ldquo;How to fill&rdquo; tab)</span>
    </p>
  );
}

/** Section 1: comedians. Published at once, marked "seeded by Comedy Radar". */
export function ComedianImport({ initial = START_COMEDIANS }: { initial?: ComedianImportState }) {
  const [state, action, pending] = useActionState(importComedians, initial);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [localError, setLocalError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const showPreview = state.step === "preview" && !localError;

  return (
    <section aria-labelledby="imp-comedians" className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <h2 id="imp-comedians" className="font-display text-2xl leading-none">
          1. COMEDIANS
        </h2>
        <p className="text-sm text-radar-purple/80">
          One row per comedian. Imported comedians go live at once and are marked &ldquo;seeded by Comedy Radar&rdquo; until they claim their profile. Names already on the site are skipped. Add photos later on each profile.
        </p>
        <Templates base="comedians-import-template" />
      </div>
      <form ref={form} action={action} className="flex flex-col gap-4">
        <FilePicker
          id="imp-comedians-file"
          csv={csv}
          fileName={fileName}
          onError={(m) => {
            setLocalError(m);
            setFileName("");
          }}
          onRead={(t, n) => {
            setLocalError("");
            setCsv(t);
            setFileName(n);
            queueMicrotask(() => form.current?.requestSubmit());
          }}
        />
        {pending && <p className="text-sm font-bold">Checking the file…</p>}
        {localError && <p className={errText}>{localError}</p>}
        {!localError && state.message && !pending && <p className={state.ok ? okText : errText}>{state.message}</p>}

        {showPreview && (
          <>
            <Counts counts={state.counts} noun={["comedian", "comedians"]} />
            <div className="overflow-x-auto rounded-card border border-radar-purple/10">
              <table className="w-full min-w-[640px] border-collapse">
                <thead className="bg-lavender">
                  <tr>
                    <th className={th}>Row</th>
                    <th className={th}>Name</th>
                    <th className={th}>Arabic name</th>
                    <th className={th}>Home country</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((r) => (
                    <tr key={r.line} className="border-t border-radar-purple/10">
                      <td className={`${td} text-radar-purple/70`}>{r.line}</td>
                      <td className={`${td} font-extrabold`}>{r.name || "—"}</td>
                      <td className={td} dir="auto">
                        {r.name_ar || "—"}
                      </td>
                      <td className={td}>{r.country || "—"}</td>
                      <td className={td}>
                        <Status status={r.status} message={r.message} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" name="intent" value="import" disabled={pending || state.counts.ready === 0} className={`${yellowBtn} px-6`}>
                {pending ? "Importing…" : `Import ${plural(state.counts.ready, "comedian", "comedians")}`}
              </button>
              {state.counts.error > 0 && <p className="text-sm text-radar-purple/75">Rows to fix are left out. Fix them in the file and upload it again: rows already imported are skipped.</p>}
            </div>
          </>
        )}
      </form>
    </section>
  );
}

/** Section 2: shows. They go in as Pending for the Review queue. */
export function ShowImport({ initial = START_SHOWS }: { initial?: ShowImportState }) {
  const [state, action, pending] = useActionState(importShows, initial);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [createMissing, setCreateMissing] = useState(initial.createMissing);
  const [localError, setLocalError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const showPreview = state.step === "preview" && !localError;
  const recheck = () => queueMicrotask(() => form.current?.requestSubmit());

  return (
    <section aria-labelledby="imp-shows" className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <h2 id="imp-shows" className="font-display text-2xl leading-none">
          2. SHOWS
        </h2>
        <p className="text-sm text-radar-purple/80">
          One row per show. Performers, cities, venues and tours are matched by name. Every show goes in as Pending, so you check it in the Review queue before it goes live. Times are Cairo time, like the Add a show form. A show with the same performer, city, date and time as one on the site is skipped. Add posters later on each show.
        </p>
        <Templates base="show-import-template" />
      </div>
      <form ref={form} action={action} className="flex flex-col gap-4">
        <FilePicker
          id="imp-shows-file"
          csv={csv}
          fileName={fileName}
          onError={(m) => {
            setLocalError(m);
            setFileName("");
          }}
          onRead={(t, n) => {
            setLocalError("");
            setCsv(t);
            setFileName(n);
            recheck();
          }}
        />
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="create_missing"
            value="yes"
            checked={createMissing}
            onChange={(e) => {
              setCreateMissing(e.target.checked);
              if (csv) recheck();
            }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-radar-purple"
          />
          <span>
            <strong>Add missing performers</strong> as new Pending comedian profiles. Without this, a show with a performer who isn&apos;t on the site yet is left out.
          </span>
        </label>
        {pending && <p className="text-sm font-bold">Checking the file…</p>}
        {localError && <p className={errText}>{localError}</p>}
        {!localError && state.message && !pending && <p className={state.ok ? okText : errText}>{state.message}</p>}

        {showPreview && (
          <>
            <Counts counts={state.counts} noun={["show", "shows"]} />
            <div className="overflow-x-auto rounded-card border border-radar-purple/10">
              <table className="w-full min-w-[820px] border-collapse">
                <thead className="bg-lavender">
                  <tr>
                    <th className={th}>Row</th>
                    <th className={th}>Show</th>
                    <th className={th}>When</th>
                    <th className={th}>Where</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((r) => (
                    <tr key={r.line} className="border-t border-radar-purple/10">
                      <td className={`${td} text-radar-purple/70`}>{r.line}</td>
                      <td className={td}>
                        <span className="block font-extrabold">{r.title || "—"}</span>
                        <span className="text-radar-purple/80">
                          {r.performers.map((p, i) => (
                            <span key={`${p.name}-${i}`}>
                              {i > 0 && ", "}
                              {p.name}
                              {p.isNew && <span className="ml-1 rounded bg-lavender px-1 text-[11px] font-extrabold">NEW</span>}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {r.date || "—"}
                        <br />
                        {r.time}
                      </td>
                      <td className={td}>
                        {r.place || "—"}
                        {r.venue && <span className="block text-radar-purple/80">{r.venue}</span>}
                      </td>
                      <td className={`${td} max-w-[300px]`}>
                        <Status status={r.status} message={r.message} />
                        {r.status === "ready" &&
                          r.notes.map((n) => (
                            <span key={n} className="mt-1 block text-xs text-radar-purple/75">
                              {n}
                            </span>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" name="intent" value="import" disabled={pending || state.counts.ready === 0} className={`${yellowBtn} px-6`}>
                {pending ? "Importing…" : `Import ${plural(state.counts.ready, "show", "shows")} as Pending`}
              </button>
              {state.counts.error > 0 && <p className="text-sm text-radar-purple/75">Rows to fix are left out. Fix them in the file and upload it again: rows already imported are skipped.</p>}
            </div>
          </>
        )}
        {state.step === "done" && (
          <a href="/admin/review?tab=shows" className={`${outlineBtn} self-start`}>
            Open the Review queue
          </a>
        )}
      </form>
    </section>
  );
}
