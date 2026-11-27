import { describe, expect, it } from "vitest";
import { withReferral } from "./ticket-links";

describe("withReferral", () => {
  it("adds the three tags", () => {
    expect(withReferral("https://www.ticketsmarche.com/event/123", "big-night-cairo")).toBe(
      "https://www.ticketsmarche.com/event/123?utm_source=comedyradar&utm_medium=referral&utm_campaign=big-night-cairo",
    );
  });

  it("keeps the link's own query and #part", () => {
    const out = new URL(withReferral("https://tix.example.com/e?id=9&lang=en#seats", "show"));
    expect(out.searchParams.get("id")).toBe("9");
    expect(out.searchParams.get("lang")).toBe("en");
    expect(out.searchParams.get("utm_source")).toBe("comedyradar");
    expect(out.hash).toBe("#seats");
  });

  it("leaves organiser utm tags alone", () => {
    const url = "https://tix.example.com/e?utm_source=instagram&utm_campaign=promo";
    expect(withReferral(url, "show")).toBe(url);
  });

  it("does not add tags twice", () => {
    const once = withReferral("https://tix.example.com/e", "show");
    expect(withReferral(once, "show")).toBe(once);
  });

  it("leaves bad or non-web links as they are", () => {
    expect(withReferral("not a url", "show")).toBe("not a url");
    expect(withReferral("mailto:tickets@example.com", "show")).toBe("mailto:tickets@example.com");
  });

  it("skips an empty campaign", () => {
    expect(withReferral("https://tix.example.com/e", "")).toBe(
      "https://tix.example.com/e?utm_source=comedyradar&utm_medium=referral",
    );
  });
});

