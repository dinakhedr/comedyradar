import { describe, expect, it } from "vitest";
import {
  cleanPageUrl,
  contactHref,
  contactTopicOf,
  senderLabel,
  senderTypeOf,
  topicLabel,
} from "./contact";

describe("contact", () => {
  it("keeps only known choices", () => {
    expect(senderTypeOf("press")).toBe("press");
    expect(senderTypeOf("boss")).toBe("");
    expect(contactTopicOf("wrong_detail")).toBe("wrong_detail");
    expect(contactTopicOf(undefined)).toBe("");
  });

  it("labels choices", () => {
    expect(senderLabel("venue")).toBe("A venue or organiser");
    expect(topicLabel(null)).toBe("Not said");
  });

  it("keeps site paths and web links only", () => {
    expect(cleanPageUrl(" /shows/x ")).toBe("/shows/x");
    expect(cleanPageUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(cleanPageUrl("javascript:alert(1)")).toBeNull();
    expect(cleanPageUrl("/a b")).toBeNull();
    expect(cleanPageUrl("/" + "a".repeat(600))).toBeNull();
    expect(cleanPageUrl(3)).toBeNull();
  });

  it("builds a prefilled link", () => {
    expect(contactHref("wrong_detail", "https://x.app/shows/a")).toBe(
      "/contact?topic=wrong_detail&page=https%3A%2F%2Fx.app%2Fshows%2Fa",
    );
    expect(contactHref("other")).toBe("/contact?topic=other");
  });
});
