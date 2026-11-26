import { describe, expect, it } from "vitest";
import { isBot, parseStat, sumStats } from "./page-stats";

const id = "3f1c2a9e-1b2c-4d5e-8f90-1234567890ab";

describe("page stats", () => {
  it("accepts only known kinds and real ids", () => {
    expect(parseStat({ kind: "show_view", id })).toEqual({ kind: "show_view", id });
    expect(parseStat({ kind: "nope", id })).toBeNull();
    expect(parseStat({ kind: "show_view", id: "1; drop table" })).toBeNull();
    expect(parseStat(null)).toBeNull();
  });
  it("skips bots", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe(false);
  });
  it("adds up views and clicks", () => {
    const s = sumStats([
      { kind: "group_view", entity_id: "g", total: "5" },
      { kind: "show_view", entity_id: "s", total: 3 },
      { kind: "ticket_click", entity_id: "s", total: 2 },
    ]);
    expect(s.views).toBe(8);
    expect(s.clicks).toBe(2);
    expect(s.clicksByShow.get("s")).toBe(2);
  });
});
