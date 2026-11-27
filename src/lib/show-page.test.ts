import { describe, expect, it } from "vitest";
import { audienceLine, buildIcs, displaySignal, formatLongDate, formatPrice, paragraphs, showBadges, ticketSite, timeLine } from "./show-page";

const now = new Date("2026-11-26T12:00:00Z");

describe("displaySignal", () => {
  it("drops 'new' after 7 days", () => {
    expect(displaySignal("new", "2026-11-25T00:00:00Z", now)).toBe("new");
    expect(displaySignal("new", "2026-11-01T00:00:00Z", now)).toBe("none");
    expect(displaySignal("fading", "2026-01-01T00:00:00Z", now)).toBe("fading");
  });
});

describe("showBadges", () => {
  const base = { status: "published" as const, zone: "local" as const, signal: "fading" as const, created_at: "2026-01-01" };
  it("signal, type and zone", () => {
    expect(showBadges(base, [{ kind: "group" }], now).map((b) => b.label)).toEqual([
      "Fading",
      "Group show",
      "In Egypt",
    ]);
  });
  it("cancelled replaces the signal; lineup and visiting", () => {
    const labels = showBadges({ ...base, status: "cancelled", zone: "inbound" }, [{ kind: "comedian" }, { kind: "comedian" }], now).map(
      (b) => b.label,
    );
    expect(labels).toEqual(["Cancelled", "Lineup", "Visiting"]);
  });
  it("uses the card icons", () => {
    expect(showBadges({ ...base, signal: "new", created_at: "2026-11-25", zone: "outbound" }, [{ kind: "comedian" }], now).map((b) => b.icon)).toEqual([
      "new",
      "solo",
      "tour",
    ]);
  });
});

describe("formatPrice", () => {
  it("formats a range, one price, or nothing", () => {
    expect(formatPrice(200, 1500, "EGP")).toBe("EGP 200 – 1,500");
    expect(formatPrice(300, null, "EGP")).toBe("EGP 300");
    expect(formatPrice(300, 300, "AED")).toBe("AED 300");
    expect(formatPrice(null, null, "EGP")).toBeNull();
  });
});

describe("small formatters", () => {
  it("ticket site", () => {
    expect(ticketSite("https://www.tazkarti.com/#/event/1")).toBe("tazkarti.com");
    expect(ticketSite("not a url")).toBeNull();
  });
  it("long date in Cairo", () => {
    expect(formatLongDate(new Date("2026-11-28T22:30:00Z"))).toBe("Sunday, 29 November 2026");
  });
  it("time line with duration", () => {
    const s = new Date("2026-11-28T19:30:00Z");
    expect(timeLine(s, new Date("2026-11-28T21:00:00Z"))).toBe("Show 9:30 PM · about 90 min");
    expect(timeLine(s, null)).toBe("Show 9:30 PM");
    expect(timeLine(s, null, new Date("2026-11-28T18:30:00Z"))).toBe("Doors 8:30 PM · Show 9:30 PM");
  });
  it("audience line", () => {
    expect(audienceLine("Arabic", "16+")).toBe("Arabic · 16+");
    expect(audienceLine(null, " ")).toBeNull();
  });
  it("paragraphs", () => {
    expect(paragraphs("One\n\nTwo\n")).toEqual(["One", "Two"]);
    expect(paragraphs(null)).toEqual([]);
  });
});

describe("buildIcs", () => {
  it("makes a valid event with escaped text", () => {
    const ics = buildIcs({
      uid: "abc",
      title: "Show, one; two",
      starts: new Date("2026-11-28T19:30:00Z"),
      ends: null,
      location: "Room, Cairo",
      url: "https://x.test/shows/a",
      now,
    });
    expect(ics).toContain("DTSTART:20261128T193000Z");
    expect(ics).toContain("DTEND:20261128T213000Z");
    expect(ics).toContain("SUMMARY:Show\\, one\\; two");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
