import { describe, expect, it } from "vitest";
import { authMessage, checkNewPassword, checkSignUp, passwordOk, passwordStrength, safeNext } from "./auth-forms";

const good = { name: "Dina K", email: "dina@example.com", password: "radar2026", confirm: "radar2026", type: "comedian", terms: true };

describe("sign-up rules", () => {
  it("accepts a good form", () => expect(checkSignUp(good)).toEqual({}));
  it("explains each problem", () => {
    const e = checkSignUp({ name: "", email: "x@", password: "short", confirm: "nope", type: "fan", terms: false });
    expect(Object.keys(e).sort()).toEqual(["confirm", "email", "name", "password", "terms", "type"]);
  });
  it("needs a number or symbol", () => {
    expect(passwordOk("abcdefgh")).toBe(false);
    expect(passwordOk("abcdefg!")).toBe(true);
    expect(checkNewPassword("abcdefg1", "abcdefg1")).toEqual({});
  });
  it("rates strength", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("Radar-2026-Cairo")).toBe(4);
  });
});

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/dashboard/shows")).toBe("/dashboard/shows");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
  });
});

it("turns auth codes into plain messages", () => {
  expect(authMessage("invalid_credentials", "x")).toMatch(/don't match/);
  expect(authMessage("something_new", "fallback")).toBe("fallback");
});
