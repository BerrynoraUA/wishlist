import { describe, expect, it } from "vitest";
import { extractSharedProductUrl } from "./share-intent";

describe("extractSharedProductUrl", () => {
  it("prefers the web url over the accompanying text", () => {
    expect(
      extractSharedProductUrl({
        webUrl: "https://amazon.com/dp/B01",
        text: "Sony WH-1000XM5 https://example.com/other",
      }),
    ).toBe("https://amazon.com/dp/B01");
  });

  it("takes a bare url shared as text", () => {
    expect(extractSharedProductUrl({ text: "https://amazon.com/dp/B01?th=1" })).toBe(
      "https://amazon.com/dp/B01?th=1",
    );
  });

  it("pulls the url out of a sentence", () => {
    expect(
      extractSharedProductUrl({ text: "check this out https://amazon.com/dp/B01?a=1 nice" }),
    ).toBe("https://amazon.com/dp/B01?a=1");
  });

  it("pulls the url out of multi-line share text", () => {
    expect(
      extractSharedProductUrl({
        text: "Sony WH-1000XM5\n\nhttps://www.instagram.com/p/Cabc123/\n\nSent from Instagram",
      }),
    ).toBe("https://www.instagram.com/p/Cabc123/");
  });

  it("drops sentence punctuation stuck to the end of the url", () => {
    expect(extractSharedProductUrl({ text: "want this https://amazon.com/dp/B01." })).toBe(
      "https://amazon.com/dp/B01",
    );
  });

  it("skips a leading non-http link and keeps looking", () => {
    expect(
      extractSharedProductUrl({ text: "ftp://files.example.com https://amazon.com/dp/B01" }),
    ).toBe("https://amazon.com/dp/B01");
  });

  it.each([
    { case: "text with no link", intent: { text: "remind me to buy headphones" } },
    { case: "a non-http scheme", intent: { text: "wishlane://wishlists/1" } },
    { case: "an empty payload", intent: { webUrl: null, text: null } },
    { case: "no payload", intent: null },
  ])("returns null for $case", ({ intent }) => {
    expect(extractSharedProductUrl(intent)).toBeNull();
  });
});
