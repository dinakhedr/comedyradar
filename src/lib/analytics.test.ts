import { describe, expect, it } from "vitest";
import { podcastPlatform, ticketsClickEvent } from "./analytics-events";
import { consentDefaultsScript, consentFor, DEFAULT_CONSENT, parseChoice } from "./consent";

describe("consent", () => {
  it("starts with every signal denied", () => {
    expect(Object.values(DEFAULT_CONSENT)).toEqual(["denied", "denied", "denied", "denied"]);
  });
  it("accept turns on analytics only, never the ad signals", () => {
    expect(consentFor("granted")).toEqual({
      ad_storage: "denied",
      analytics_storage: "granted",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(consentFor("denied")).toEqual(DEFAULT_CONSENT);
  });
  it("reads only known saved values", () => {
    expect(parseChoice("granted")).toBe("granted");
    expect(parseChoice("denied")).toBe("denied");
    expect(parseChoice("yes")).toBeNull();
    expect(parseChoice(null)).toBeNull();
  });
  it("sets denied defaults before applying a saved accept", () => {
    const script = consentDefaultsScript();
    const def = script.indexOf("'consent','default'");
    const upd = script.indexOf("'consent','update'");
    expect(def).toBeGreaterThan(-1);
    expect(upd).toBeGreaterThan(def);
    expect(script).toContain('"analytics_storage":"denied"');
  });
  it("the defaults script runs and pushes consent to the dataLayer", () => {
    const w = { dataLayer: [] as unknown[][] };
    const storage = { getItem: () => "granted" };
    new Function("window", "dataLayer", "localStorage", consentDefaultsScript())(w, w.dataLayer, storage);
    const calls = w.dataLayer.map((a) => Array.from(a as ArrayLike<unknown>));
    expect(calls[0].slice(0, 2)).toEqual(["consent", "default"]);
    expect(calls[1]).toEqual(["consent", "update", consentFor("granted")]);
  });
});

describe("events", () => {
  it("builds get_tickets_click with every field", () => {
    expect(
      ticketsClickEvent({ id: "s1", title: "Big Night", performer: null, city: "Cairo", zone: "local" }),
    ).toEqual({
      name: "get_tickets_click",
      params: { show_id: "s1", show_title: "Big Night", performer: "", city: "Cairo", zone: "local" },
    });
  });
  it("maps listen buttons to platforms", () => {
    expect(podcastPlatform("Apple Podcasts")).toBe("apple");
    expect(podcastPlatform("Spotify")).toBe("spotify");
    expect(podcastPlatform("Anghami")).toBe("anghami");
    expect(podcastPlatform("podU")).toBe("podu");
    expect(podcastPlatform("YouTube")).toBeNull();
  });
});
