import { describe, expect, it } from "vitest";
import {
  cleanText,
  comparePrices,
  normalizeCurrency,
  normalizeDiscount,
  normalizeImageUrl,
  normalizePrice,
} from "../src/normalization";

describe("cleanText", () => {
  it("unescapes entities and collapses whitespace", () => {
    expect(cleanText("  Nike  Air &amp; Co.\n Max  ")).toBe("Nike Air & Co. Max");
    expect(cleanText("&#8212; &#x2014; &rsquo;")).toBe("— — ’");
    expect(cleanText("   ")).toBeNull();
    expect(cleanText(null)).toBeNull();
  });

  it("leaves unknown entities alone, like html.unescape", () => {
    expect(cleanText("&notarealentity; x")).toBe("&notarealentity; x");
  });
});

describe("normalizePrice", () => {
  it("infers the decimal separator from the last separator position", () => {
    expect(normalizePrice("1.234,56 €")).toBe("1234.56");
    expect(normalizePrice("$1,234.56")).toBe("1234.56");
    expect(normalizePrice("1 234,50 грн")).toBe("1234.5");
    expect(normalizePrice("1.234.567")).toBe("1234567");
    expect(normalizePrice("1,234")).toBe("1234");
    expect(normalizePrice("12,5")).toBe("12.5");
    expect(normalizePrice("99.00")).toBe("99");
  });

  it("rejects junk, zero and negatives", () => {
    expect(normalizePrice("free")).toBeNull();
    expect(normalizePrice("0")).toBeNull();
    expect(normalizePrice("0.00")).toBeNull();
    expect(normalizePrice("-12.50")).toBeNull();
    expect(normalizePrice("12.34.56")).toBeNull();
    expect(normalizePrice(null)).toBeNull();
  });

  it("keeps precision beyond float safety", () => {
    expect(normalizePrice("12345678901234567.89")).toBe("12345678901234567.89");
  });
});

describe("comparePrices", () => {
  it("orders by magnitude, not string order", () => {
    expect(comparePrices("100", "99.99")).toBeGreaterThan(0);
    expect(comparePrices("9.9", "9.90")).toBe(0);
    expect(comparePrices("1234.5", "1234.51")).toBeLessThan(0);
  });
});

describe("normalizeCurrency", () => {
  it("maps symbols and aliases", () => {
    expect(normalizeCurrency("$")).toBe("USD");
    expect(normalizeCurrency("грн")).toBe("UAH");
    expect(normalizeCurrency("zł")).toBe("PLN");
    expect(normalizeCurrency("U.S.D.")).toBe("USD");
    expect(normalizeCurrency("dollars")).toBeNull();
  });
});

describe("normalizeDiscount", () => {
  it("swaps when the discount is the larger number", () => {
    expect(normalizeDiscount("80", "100")).toEqual({
      price: "100",
      discountPrice: "80",
      hasDiscount: true,
    });
  });

  it("drops equal prices", () => {
    expect(normalizeDiscount("100", "100.00")).toEqual({
      price: "100",
      discountPrice: null,
      hasDiscount: false,
    });
  });

  it("falls back to whichever side parsed", () => {
    expect(normalizeDiscount(null, "42")).toEqual({
      price: "42",
      discountPrice: null,
      hasDiscount: false,
    });
  });
});

describe("normalizeImageUrl", () => {
  const page = "https://shop.example/products/thing";

  it("resolves relative and protocol-relative URLs", () => {
    expect(normalizeImageUrl("/img/a.jpg", page)).toBe("https://shop.example/img/a.jpg");
    expect(normalizeImageUrl("//cdn.example/a.jpg", page)).toBe("https://cdn.example/a.jpg");
  });

  it("repairs doubled schemes", () => {
    expect(normalizeImageUrl("https:https://cdn.example/a.jpg", page)).toBe(
      "https://cdn.example/a.jpg",
    );
  });

  it("rejects data and javascript URLs", () => {
    expect(normalizeImageUrl("data:image/png;base64,AAA", page)).toBeNull();
    expect(normalizeImageUrl("javascript:alert(1)", page)).toBeNull();
  });

  it("works without a page URL for absolute inputs", () => {
    expect(normalizeImageUrl("https://cdn.example/a.jpg", "")).toBe("https://cdn.example/a.jpg");
    expect(normalizeImageUrl("/relative.jpg", "")).toBeNull();
  });
});
