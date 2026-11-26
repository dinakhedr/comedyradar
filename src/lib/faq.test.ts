import { describe, expect, it } from "vitest";
import { answerParts, FAQ, filterFaq } from "./faq";

describe("faq", () => {
  it("has unique ids and every topic", () => {
    expect(new Set(FAQ.map((f) => f.id)).size).toBe(FAQ.length);
    expect(new Set(FAQ.map((f) => f.topic)).size).toBe(4);
  });

  it("searches questions and answers, all words", () => {
    expect(filterFaq(FAQ, "").length).toBe(FAQ.length);
    expect(filterFaq(FAQ, "SELL tickets").map((f) => f.id)).toContain(
      "sell-tickets",
    );
    expect(filterFaq(FAQ, "fading").map((f) => f.id)).toEqual(["signals"]);
    expect(filterFaq(FAQ, "zzzz")).toEqual([]);
  });

  it("searches link labels but not link paths", () => {
    expect(filterFaq(FAQ, "dashboard/profiles")).toEqual([]);
  });

  it("filters by topic", () => {
    expect(
      filterFaq(FAQ, "", "tickets").every((f) => f.topic === "tickets"),
    ).toBe(true);
    expect(filterFaq(FAQ, "fading", "tickets")).toEqual([]);
  });

  it("turns site links into parts and leaves other links as text", () => {
    expect(answerParts("Go [here](/contact?topic=x) now")).toEqual([
      { text: "Go " },
      { label: "here", href: "/contact?topic=x" },
      { text: " now" },
    ]);
    expect(answerParts("[bad](https://evil.example)")).toEqual([
      { text: "[bad](https://evil.example)" },
    ]);
  });
});
