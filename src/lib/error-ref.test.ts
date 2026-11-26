import { describe, expect, it } from "vitest";
import { errorReference } from "./error-ref";

describe("errorReference", () => {
  it("shows the server error id only", () => {
    expect(
      errorReference(Object.assign(new Error("x"), { digest: "123456789" })),
    ).toBe("123456789");
    expect(errorReference(new Error("secret message"))).toBeNull();
    expect(errorReference("boom")).toBeNull();
    expect(errorReference({ digest: "<script>" })).toBeNull();
  });
});
