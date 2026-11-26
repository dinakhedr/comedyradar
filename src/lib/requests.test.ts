import { describe as group, expect, it } from "vitest";
import { describe, kindOf, requestKind, requestTab, tabOf, type LinkRequest } from "./requests";

const base: LinkRequest = {
  id: "1",
  direction: "incoming",
  type: "lineup_tag",
  status: "pending",
  created_at: "2026-11-20T10:00:00Z",
  decided_at: null,
  from_name: "Sara",
  target_name: "Badr Nour",
  target_slug: "badr-nour",
  group_name: null,
  group_slug: null,
  show_title: "Friday Laughs",
  show_slug: "friday-laughs",
  show_starts_at: "2026-12-04T18:00:00Z",
  show_city: "Cairo",
  podcast_name: null,
};

group("requests", () => {
  it("puts waiting requests in Incoming or Sent, and answered ones in History", () => {
    expect(tabOf(base)).toBe("incoming");
    expect(tabOf({ ...base, direction: "sent" })).toBe("sent");
    expect(tabOf({ ...base, status: "declined" })).toBe("history");
  });
  it("reads tabs and types from the address safely", () => {
    expect(requestTab("sent")).toBe("sent");
    expect(requestTab("nope")).toBe("incoming");
    expect(requestKind("team")).toBe("team");
    expect(requestKind(undefined)).toBeNull();
    expect(kindOf("podcast_cohost")).toBe("podcast");
  });
  it("says who asked for what", () => {
    expect(describe(base)).toBe("Sara tagged Badr Nour in the lineup of Friday Laughs.");
    expect(describe({ ...base, direction: "sent", type: "group_member", group_name: "HighFive" })).toBe("You added Badr Nour as a member of HighFive.");
    expect(describe({ ...base, type: "podcast_cohost", podcast_name: "Kalam" })).toBe("Sara added Badr Nour as a co-host of Kalam.");
  });
});
