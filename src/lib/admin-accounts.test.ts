import { describe, expect, it } from "vitest";
import {
  accountStatusOf,
  accountTypeOf,
  isAccountAction,
  signUpMethod,
} from "./admin-accounts";

describe("admin accounts", () => {
  it("keeps only known filters", () => {
    expect(accountTypeOf("manager")).toBe("manager");
    expect(accountTypeOf("robot")).toBe("");
    expect(accountStatusOf("suspended")).toBe("suspended");
    expect(accountStatusOf(undefined)).toBe("");
  });
  it("knows the actions", () => {
    expect(isAccountAction("suspend")).toBe(true);
    expect(isAccountAction("delete")).toBe(false);
  });
  it("names the sign-up method", () => {
    expect(signUpMethod("email")).toBe("Email and password");
    expect(signUpMethod(null)).toBe("Email and password");
    expect(signUpMethod("google")).toBe("Google");
  });
});
