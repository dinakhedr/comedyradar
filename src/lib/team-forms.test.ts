import { describe, expect, it } from "vitest";
import { accessChips, checkInvite } from "./team-forms";

const G = { kind: "group" as const, id: "11111111-1111-4111-8111-111111111111" };
const C = { kind: "comedian" as const, id: "22222222-2222-4222-8222-222222222222" };
const roles: Record<string, string> = { [`g:${G.id}`]: "admin" };
const base = { email: " Sara@Example.com ", scope: "selected", all_role: "", picked: [`g:${G.id}`, `c:${C.id}`, "c:not-mine"], roleOf: (k: string) => roles[k] ?? "" };

describe("checkInvite", () => {
  it("keeps only profiles the owner can share, with a role each", () => {
    const r = checkInvite(base, [G, C], "me@example.com");
    expect(r.email).toBe("sara@example.com");
    expect(r.access).toEqual({ scope: "selected", profiles: [{ ...G, role: "admin" }, { ...C, role: "moderator" }] });
  });
  it("gives one role for all profiles", () => {
    expect(checkInvite({ ...base, scope: "all", all_role: "moderator" }, [G], "me@example.com").access).toEqual({ scope: "all", role: "moderator" });
    expect(checkInvite({ ...base, scope: "all", all_role: "owner" }, [G], "me@example.com").errors.access).toBeTruthy();
  });
  it("needs a real email that is not your own, and at least one profile", () => {
    const r = checkInvite({ ...base, email: "me@example.com", picked: [] }, [G], "ME@example.com");
    expect(r.errors).toEqual({ email: "This is your own email.", access: "Please tick at least one profile." });
    expect(checkInvite({ ...base, email: "sara@" }, [G], "x@y.com").errors.email).toBeTruthy();
  });
});

describe("accessChips", () => {
  it("describes the access of a team member", () => {
    expect(accessChips({ scope: "all", all_role: "moderator" }, [])).toEqual(["All profiles · Moderator"]);
    expect(accessChips({ scope: "selected", all_role: null }, [{ name: "Badr Nour", role: "admin" }, { name: "HighFive", role: "moderator" }])).toEqual([
      "Badr Nour · Admin",
      "HighFive · Moderator",
    ]);
  });
});
