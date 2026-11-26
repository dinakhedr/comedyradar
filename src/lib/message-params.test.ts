import { describe, expect, it } from "vitest";
import { withoutMessageParams } from "./message-params";

describe("withoutMessageParams", () => {
  it("removes the message and keeps filters", () => {
    expect(withoutMessageParams("?msg=deleted&kind=group&q=ali")).toBe("?kind=group&q=ali");
  });
  it("leaves an empty address when only the message was there", () => {
    expect(withoutMessageParams("?msg=saved")).toBe("");
  });
  it("removes every message word (tour saved note)", () => {
    expect(withoutMessageParams("?as=published&dates=3&imported=1&failed=0&tab=all")).toBe("?tab=all");
  });
  it("says nothing changed when there is no message", () => {
    expect(withoutMessageParams("?kind=group")).toBeNull();
    expect(withoutMessageParams("")).toBeNull();
  });
});
