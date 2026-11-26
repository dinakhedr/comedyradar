import { describe, expect, it } from "vitest";
import { firstName, pickProfile, profileKey, profileStatus, type ManagedProfile } from "./dashboard";

const p = (kind: "comedian" | "group", slug: string, extra: Partial<ManagedProfile> = {}): ManagedProfile => ({
  kind,
  id: `${kind}-${slug}`,
  name: slug,
  slug,
  photo_url: null,
  status: "published",
  verified: false,
  role: "admin",
  ...extra,
});

describe("dashboard helpers", () => {
  const list = [p("group", "highfive"), p("comedian", "badr")];
  it("keeps the picked profile in the address", () => {
    expect(profileKey(list[0])).toBe("g:highfive");
    expect(pickProfile(list, "c:badr")?.slug).toBe("badr");
    expect(pickProfile(list, "c:nobody")).toBeNull();
    expect(pickProfile(list, undefined)).toBeNull();
  });
  it("labels profile status", () => {
    expect(profileStatus({ status: "published", verified: true }).label).toBe("Verified");
    expect(profileStatus({ status: "pending", verified: false }).label).toBe("Pending review");
    expect(profileStatus({ status: "draft", verified: false }).label).toBe("Draft");
  });
  it("greets by first name", () => {
    expect(firstName("Dina Khedr")).toBe("Dina");
    expect(firstName(null)).toBe("there");
  });
});
