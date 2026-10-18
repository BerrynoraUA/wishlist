import { describe, expect, it } from "vitest";
import { convertPrice, formatConvertedPrice, formatItemPrice } from "./prices";

const RATES = { EUR: 0.9, GBP: 0.8 };

describe("price helpers", () => {
  it("formats a stored price with its currency symbol", () => {
    expect(formatItemPrice("49.99", "USD")).toBe("$49.99");
    expect(formatItemPrice(12, "eur")).toBe("EUR 12.00");
    expect(formatItemPrice("100", "GBP")).toBe("£100");
    expect(formatItemPrice("", "USD")).toBe("");
  });

  it("converts through USD, which has no row of its own", () => {
    expect(convertPrice(100, "USD", "EUR", RATES)).toBeCloseTo(90);
    expect(convertPrice(90, "EUR", "USD", RATES)).toBeCloseTo(100);
    expect(convertPrice(90, "EUR", "GBP", RATES)).toBeCloseTo(80);
    expect(convertPrice(10, "XYZ", "EUR", RATES)).toBeNull();
  });

  it("shows the price in the display currency", () => {
    expect(formatConvertedPrice("100", "USD", "EUR", RATES)).toBe("EUR 90.00");
    expect(formatConvertedPrice("1,234.50", "GBP", "USD", RATES)).toBe("$1543.13");
  });

  it("keeps the item's own currency when it cannot convert", () => {
    expect(formatConvertedPrice("100", "EUR", "EUR", RATES)).toBe("EUR 100");
    expect(formatConvertedPrice("100", "XYZ", "EUR", RATES)).toBe("XYZ 100");
    expect(formatConvertedPrice("100", "USD", "EUR", undefined)).toBe("$100");
    expect(formatConvertedPrice("ask me", "USD", "EUR", RATES)).toBe("");
  });

  it("rounds to the nearest whole amount when asked", () => {
    expect(formatItemPrice("48.99", "USD", { round: true })).toBe("$49");
    expect(formatItemPrice(12.4, "EUR", { round: true })).toBe("EUR 12");
    expect(formatConvertedPrice("100", "USD", "EUR", RATES, { round: true })).toBe("EUR 90");
    expect(formatConvertedPrice("1,234.50", "GBP", "GBP", RATES, { round: true })).toBe("£1235");
    expect(formatItemPrice("ask me", "USD", { round: true })).toBe("");
  });
});
