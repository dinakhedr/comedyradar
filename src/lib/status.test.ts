import { describe, expect, it } from "vitest";
import { STATUS_COLORS, statusKind } from "./status";

describe("statusKind", () => {
  it("maps the five statuses to themselves", () => {
    for (const s of ["published", "pending", "draft", "archived", "rejected"]) expect(statusKind(s)).toBe(s);
  });
  it("maps synonyms", () => {
    expect(statusKind("Live")).toBe("published");
    expect(statusKind("approved")).toBe("published");
    expect(statusKind("accepted")).toBe("published");
    expect(statusKind("In review")).toBe("pending");
    expect(statusKind("declined")).toBe("rejected");
    expect(statusKind("expired")).toBe("archived");
  });
  it("treats unknown or empty as draft", () => {
    expect(statusKind("weird")).toBe("draft");
    expect(statusKind(null)).toBe("draft");
  });
  it("uses green for Published and yellow for Pending", () => {
    expect(STATUS_COLORS.published).toContain("#157a3f");
    expect(STATUS_COLORS.pending).toContain("spotlight-yellow");
    expect(STATUS_COLORS.rejected).toContain("#d12a1f");
  });
});
