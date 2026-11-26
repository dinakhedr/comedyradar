/** Admin Activity log (spec 11.5 item 7): filters, labels, grouping and CSV. */

export type ActivityEntry = {
  id: number;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  account_id: string | null;
  who: string | null;
  role: string;
  target: string | null;
  tbl: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
};

export const ACTIVITY_TYPES = [
  { value: "comedian", label: "Comedian" },
  { value: "group", label: "Group" },
  { value: "show", label: "Show" },
  { value: "tour", label: "Tour" },
  { value: "podcast", label: "Podcast" },
  { value: "venue", label: "Venue" },
  { value: "access", label: "Access" },
  { value: "team", label: "Team" },
  { value: "spotlight", label: "Spotlight" },
] as const;

export const ACTIVITY_ACTIONS = [
  { value: "create", label: "Created" },
  { value: "update", label: "Edited" },
  { value: "publish", label: "Published" },
  { value: "cancel", label: "Cancelled" },
  { value: "approve", label: "Approved" },
  { value: "role_change", label: "Changed a role" },
  { value: "invite", label: "Invited" },
  { value: "delete", label: "Deleted" },
] as const;

export const ACTIVITY_PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All (24 months)" },
] as const;

const pick = (
  list: readonly { value: string }[],
  v: string | undefined,
  fallback: string,
) => (list.some((x) => x.value === v) ? (v as string) : fallback);
export const activityTypeOf = (v?: string) => pick(ACTIVITY_TYPES, v, "");
export const activityActionOf = (v?: string) => pick(ACTIVITY_ACTIONS, v, "");
export const activityPeriodOf = (v?: string) =>
  pick(ACTIVITY_PERIODS, v, "30d");

export const typeLabel = (t: string) =>
  ACTIVITY_TYPES.find((x) => x.value === t)?.label ?? t;
export const actionLabel = (a: string) =>
  ACTIVITY_ACTIONS.find((x) => x.value === a)?.label ?? a;

/** "Fields" that only the database uses; they are not shown in before / after tables. */
const HIDDEN = new Set([
  "id",
  "created_at",
  "created_by",
  "search",
  "fts",
  "token",
  "invited_by",
  "via_dashboard_member_id",
]);

/** Changed fields as rows, without internal fields. */
export function changeRows(
  changes: ActivityEntry["changes"],
): { field: string; from: string; to: string }[] {
  if (!changes) return [];
  return Object.entries(changes)
    .filter(([k]) => !HIDDEN.has(k))
    .map(([k, v]) => ({
      field: fieldLabel(k),
      from: show(v?.from),
      to: show(v?.to),
    }));
}

export function fieldLabel(k: string): string {
  const s = k.replace(/_id$/, "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime()))
        return d.toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Africa/Cairo",
        });
    }
    return v.length > 160 ? `${v.slice(0, 157)}...` : v;
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const j = JSON.stringify(v);
  return j.length > 160 ? `${j.slice(0, 157)}...` : j;
}

/** Cairo calendar day of an entry, e.g. "2026-11-26". */
export const cairoDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

/** Entries grouped by Cairo day, newest day first (entries arrive newest first). */
export function groupByDay<T extends { created_at: string }>(
  rows: T[],
): { day: string; rows: T[] }[] {
  const out: { day: string; rows: T[] }[] = [];
  for (const r of rows) {
    const d = cairoDay(r.created_at);
    const last = out[out.length - 1];
    if (last && last.day === d) last.rows.push(r);
    else out.push({ day: d, rows: [r] });
  }
  return out;
}

const cell = (v: string) =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
/** Cells that start with =, +, - or @ are made safe for spreadsheets. */
const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function activityCsv(rows: ActivityEntry[]): string {
  const head = [
    "Time (Cairo)",
    "Person",
    "Role",
    "Action",
    "Type",
    "Item",
    "Changes",
  ];
  const lines = rows.map((r) => {
    const changes = changeRows(r.changes)
      .map((c) => `${c.field}: ${c.from} -> ${c.to}`)
      .join("; ");
    const time = new Date(r.created_at).toLocaleString("en-GB", {
      timeZone: "Africa/Cairo",
    });
    return [
      time,
      r.who ?? "System",
      r.role,
      actionLabel(r.action),
      typeLabel(r.entity_type),
      r.target ?? "",
      changes,
    ]
      .map((v) => cell(safe(v)))
      .join(",");
  });
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}
