import { describe, expect, it } from "vitest";
import { cleanEmail, clientIp, looksLikeBot, MIN_FILL_MS } from "./newsletter";

describe("cleanEmail", () => {
  it("trims and lowercases", () => {
    expect(cleanEmail("  Fan@Example.COM ")).toBe("fan@example.com");
    expect(cleanEmail("o'brien+radar@mail.co.uk")).toBe("o'brien+radar@mail.co.uk");
  });
  it("rejects things that are not emails", () => {
    for (const bad of ["", "fan", "fan@", "@x.com", "fan@x", "a b@x.com", null, 42]) expect(cleanEmail(bad)).toBeNull();
    expect(cleanEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(clientIp("1.2.3.4, 10.0.0.1", null)).toBe("1.2.3.4");
    expect(clientIp(null, " 5.6.7.8 ")).toBe("5.6.7.8");
    expect(clientIp(null, null)).toBe("unknown");
  });
});

describe("looksLikeBot", () => {
  const now = 1_000_000;
  it("catches the hidden field and very fast forms", () => {
    expect(looksLikeBot("http://spam", now - 10_000, now)).toBe(true);
    expect(looksLikeBot("", now - 100, now)).toBe(true);
    expect(looksLikeBot("", "abc", now)).toBe(true);
  });
  it("lets people through", () => {
    expect(looksLikeBot("", String(now - MIN_FILL_MS - 1), now)).toBe(false);
  });
});
