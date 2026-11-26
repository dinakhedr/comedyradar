import { describe, expect, it } from "vitest";
import {
  activityCsv,
  activityPeriodOf,
  activityTypeOf,
  changeRows,
  groupByDay,
  type ActivityEntry,
} from "./admin-activity";

const base: ActivityEntry = {
  id: 1,
  created_at: "2026-11-26T10:00:00Z",
  action: "update",
  entity_type: "show",
  entity_id: null,
  account_id: null,
  who: "Dina",
  role: "Super admin",
  target: "Big Night",
  tbl: "shows",
  changes: {
    status: { from: "draft", to: "published" },
    id: { from: "a", to: "b" },
    ticket_url: { from: null, to: "https://x.io" },
  },
};

describe("admin activity", () => {
  it("keeps only known filters", () => {
    expect(activityTypeOf("show")).toBe("show");
    expect(activityTypeOf("planet")).toBe("");
    expect(activityPeriodOf(undefined)).toBe("30d");
  });
  it("lists changed fields without internal ones", () => {
    expect(changeRows(base.changes)).toEqual([
      { field: "Status", from: "draft", to: "published" },
      { field: "Ticket url", from: "(empty)", to: "https://x.io" },
    ]);
    expect(changeRows(null)).toEqual([]);
  });
  it("groups by Cairo day", () => {
    const rows = [
      { ...base, id: 3, created_at: "2026-11-26T23:30:00Z" }, // 27 Nov in Cairo
      { ...base, id: 2, created_at: "2026-11-26T12:00:00Z" },
      { ...base, id: 1, created_at: "2026-11-25T12:00:00Z" },
    ];
    expect(groupByDay(rows).map((g) => [g.day, g.rows.length])).toEqual([
      ["2026-11-27", 1],
      ["2026-11-26", 1],
      ["2026-11-25", 1],
    ]);
  });
  it("writes safe CSV", () => {
    const csv = activityCsv([
      { ...base, target: '=HYPERLINK("x")', changes: null },
    ]);
    expect(csv.split("\r\n")[0]).toBe(
      "Time (Cairo),Person,Role,Action,Type,Item,Changes",
    );
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(",Edited,Show,");
  });
});
