import { describe, expect, it } from "vitest";
import { isSignal, periodOf, showStatusOf, showTab, ticketCheck, zoneOf } from "./admin-shows";

describe("admin shows filters", () => {
  it("falls back to safe defaults", () => {
    expect(showTab("tours")).toBe("tours");
    expect(showTab("nope")).toBe("shows");
    expect(showTab(undefined)).toBe("shows");
    expect(periodOf("past")).toBe("past");
    expect(periodOf("x")).toBe("upcoming");
    expect(zoneOf("inbound")).toBe("inbound");
    expect(zoneOf("mars")).toBe("");
    expect(showStatusOf("asked")).toBe("asked");
    expect(showStatusOf("deleted")).toBe("");
  });
  it("knows the signals", () => {
    expect(isSignal("strong")).toBe(true);
    expect(isSignal("loud")).toBe(false);
  });
  it("checks ticket links", () => {
    expect(ticketCheck(null)).toBe("missing");
    expect(ticketCheck("  ")).toBe("missing");
    expect(ticketCheck("https://tickets.example.com/a")).toBe("ok");
    expect(ticketCheck("javascript:alert(1)")).toBe("bad");
    expect(ticketCheck("ticketsmarche")).toBe("bad");
  });
});
