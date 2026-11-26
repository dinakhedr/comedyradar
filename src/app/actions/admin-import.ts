"use server";

import { refresh, updateTag } from "next/cache";
import { checkComedians, checkShows, readyValues, summary, type ComedianRow, type ShowRow } from "@/lib/bulk-import";
import { requireSuperAdmin } from "@/lib/data/admin";
import { getComedianImportRef, getShowImportRef } from "@/lib/data/bulk-import";
import { text } from "@/lib/profile-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin Bulk import. "check" reads the file and returns the preview; "import"
 * checks it again against the latest data and saves the ready rows. The file
 * text travels with the form, so nothing is kept on the server between steps.
 */

type Counts = { ready: number; skip: number; error: number };

export type ComedianImportState = {
  step: "start" | "preview" | "done";
  message: string;
  ok: boolean;
  rows: Omit<ComedianRow, "values">[];
  counts: Counts;
  added?: number;
};

export type ShowImportState = {
  step: "start" | "preview" | "done";
  message: string;
  ok: boolean;
  rows: Omit<ShowRow, "values">[];
  counts: Counts;
  added?: { shows: number; venues: number; comedians: number };
  createMissing: boolean;
};

const EMPTY: Counts = { ready: 0, skip: 0, error: 0 };
const MAX_CHARS = 900_000;

function readFile(form: FormData): { csv: string; error?: string } {
  const csv = text(form.get("csv"));
  if (!csv.trim()) return { csv, error: "Please choose a CSV file first." };
  if (csv.length > MAX_CHARS) return { csv, error: "This file is too big. Please split it into smaller files." };
  return { csv };
}

const strip = <T extends { values?: unknown }>(rows: T[]): Omit<T, "values">[] =>
  rows.map((r) => {
    const copy = { ...r };
    delete copy.values;
    return copy;
  });

export async function importComedians(_prev: ComedianImportState, form: FormData): Promise<ComedianImportState> {
  await requireSuperAdmin();
  const { csv, error } = readFile(form);
  const fail = (message: string): ComedianImportState => ({ step: "start", message, ok: false, rows: [], counts: EMPTY });
  if (error) return fail(error);

  let checked: ReturnType<typeof checkComedians>;
  try {
    checked = checkComedians(csv, await getComedianImportRef());
  } catch (e) {
    console.error("import comedians ref", (e as Error).message);
    return fail("We couldn't read the profiles on the site. Please try again.");
  }
  if (checked.error) return fail(checked.error);
  const counts = summary(checked.rows);
  const preview: ComedianImportState = { step: "preview", message: "", ok: true, rows: strip(checked.rows), counts };
  if (text(form.get("intent")) !== "import") return preview;
  if (counts.ready === 0) return { ...preview, ok: false, message: "There are no rows ready to import." };

  const db = await createClient();
  const { data, error: rpcError } = await db.rpc("admin_import_comedians", { p_rows: readyValues(checked.rows) });
  if (rpcError || !data) {
    console.error("admin_import_comedians", rpcError?.message);
    return { ...preview, ok: false, message: "We couldn't import the comedians. Nothing was saved. Please try again." };
  }
  updateTag("profiles");
  refresh();
  const added = Number((data as { comedians: number }).comedians);
  return { step: "done", ok: true, message: `${added} ${added === 1 ? "comedian" : "comedians"} added.`, rows: [], counts, added };
}

export async function importShows(_prev: ShowImportState, form: FormData): Promise<ShowImportState> {
  await requireSuperAdmin();
  const createMissing = form.get("create_missing") === "yes";
  const { csv, error } = readFile(form);
  const fail = (message: string): ShowImportState => ({ step: "start", message, ok: false, rows: [], counts: EMPTY, createMissing });
  if (error) return fail(error);

  let checked: ReturnType<typeof checkShows>;
  try {
    checked = checkShows(csv, await getShowImportRef(), { now: new Date(), createMissing });
  } catch (e) {
    console.error("import shows ref", (e as Error).message);
    return fail("We couldn't read the shows on the site. Please try again.");
  }
  if (checked.error) return fail(checked.error);
  const counts = summary(checked.rows);
  const preview: ShowImportState = { step: "preview", message: "", ok: true, rows: strip(checked.rows), counts, createMissing };
  if (text(form.get("intent")) !== "import") return preview;
  if (counts.ready === 0) return { ...preview, ok: false, message: "There are no rows ready to import." };

  const db = await createClient();
  const { data, error: rpcError } = await db.rpc("admin_import_shows", { p_rows: readyValues(checked.rows) });
  if (rpcError || !data) {
    console.error("admin_import_shows", rpcError?.message);
    return { ...preview, ok: false, message: "We couldn't import the shows. Nothing was saved. Please try again." };
  }
  updateTag("shows");
  updateTag("profiles");
  refresh();
  const added = data as { shows: number; venues: number; comedians: number };
  const extra = [added.venues ? `${added.venues} new ${added.venues === 1 ? "venue" : "venues"}` : "", added.comedians ? `${added.comedians} new ${added.comedians === 1 ? "profile" : "profiles"}` : ""]
    .filter(Boolean)
    .join(" and ");
  return {
    step: "done",
    ok: true,
    message: `${added.shows} ${added.shows === 1 ? "show" : "shows"} added as Pending${extra ? `, plus ${extra}` : ""}. Check them in the Review queue.`,
    rows: [],
    counts,
    added,
    createMissing,
  };
}
