import { describe, expect, it } from "vitest";
import {
  browserName,
  cleanPath,
  errorPeriodOf,
  errorSourceOf,
  errorsCsv,
  isControlFlow,
  sourceLabel,
  toReport,
  type SiteError,
} from "./site-errors";

describe("cleanPath", () => {
  it("drops the query string and domain", () => {
    expect(cleanPath("/shows?city=cairo&token=abc")).toBe("/shows");
    expect(cleanPath("https://comedyradar.example/admin/shows/1/edit#x")).toBe(
      "/admin/shows/1/edit",
    );
  });
  it("hides secret links", () => {
    expect(cleanPath("/team/invite/abc123")).toBe("/team/invite/[hidden]");
    expect(cleanPath("/claim/confirm/xyz?a=1")).toBe("/claim/confirm/[hidden]");
  });
  it("is null for nothing", () => {
    expect(cleanPath("")).toBeNull();
    expect(cleanPath(undefined)).toBeNull();
    expect(cleanPath(42)).toBeNull();
  });
});

describe("isControlFlow", () => {
  it("skips redirects and not-found pages", () => {
    expect(isControlFlow({ digest: "NEXT_REDIRECT;replace;/x;307;" })).toBe(true);
    expect(isControlFlow({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })).toBe(true);
    expect(isControlFlow(Object.assign(new Error("x"), { digest: "2434855665" }))).toBe(false);
    expect(isControlFlow(new Error("x"))).toBe(false);
    expect(isControlFlow("boom")).toBe(false);
  });
});

describe("toReport", () => {
  it("reads a server error", () => {
    const err = Object.assign(new Error("Cannot read x"), { digest: "2434855665" });
    const r = toReport({
      source: "action",
      error: err,
      path: "/admin/shows/1/edit?x=1",
      route: "/admin/(panel)/shows/[id]/edit",
      method: "post",
      user_agent: "Mozilla",
    });
    expect(r).toMatchObject({
      source: "action",
      message: "Cannot read x",
      digest: "2434855665",
      path: "/admin/shows/1/edit",
      method: "POST",
    });
    expect(r?.stack).toContain("Cannot read x");
  });
  it("refuses unknown sources and cleans bad values", () => {
    expect(toReport({ source: "hack", message: "x" })).toBeNull();
    const r = toReport({ source: "browser", message: "x".repeat(5000), digest: "<script>" });
    expect(r?.message).toHaveLength(1000);
    expect(r?.digest).toBeNull();
    expect(toReport({ source: "browser" })?.message).toBe("Unknown error");
  });
});

describe("labels", () => {
  it("names where it happened", () => {
    expect(sourceLabel("render")).toBe("Server · loading a page");
    expect(sourceLabel("action")).toBe("Server · saving a form");
    expect(sourceLabel("browser")).toBe("Browser");
  });
  it("names the browser", () => {
    expect(
      browserName(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      ),
    ).toBe("Chrome on Mac");
    expect(
      browserName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone/iPad");
    expect(browserName(null)).toBeNull();
  });
  it("keeps filters to known values", () => {
    expect(errorSourceOf("server")).toBe("server");
    expect(errorSourceOf("x")).toBe("");
    expect(errorPeriodOf(undefined)).toBe("7d");
    expect(errorPeriodOf("all")).toBe("all");
  });
});

describe("errorsCsv", () => {
  it("writes safe rows", () => {
    const row: SiteError = {
      id: 1,
      created_at: "2026-11-27T13:10:00Z",
      last_seen_at: "2026-11-27T13:12:00Z",
      times: 2,
      source: "render",
      message: '=HYPERLINK("x"), oops',
      digest: "123",
      path: "/shows",
      route: null,
      method: "GET",
      user_agent: null,
      stack: null,
      who: null,
      role: null,
    };
    const csv = errorsCsv([row]);
    expect(csv.split("\r\n")[0]).toContain("Reference");
    expect(csv).toContain(`"'=HYPERLINK(""x""), oops"`);
    expect(csv).toContain("Visitor (not signed in)");
  });
});
