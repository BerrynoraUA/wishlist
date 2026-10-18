import { describe, expect, it } from "vitest";
import { convertPrice, formatMoney, formatPrice, parsePrice } from "./prices";

const RATES = { EUR: 0.9, GBP: 0.8 };
const en = { locale: "en-US" };

describe("prices", () => {
  it.each([
    ["EUR 1,234.50", 1234.5],
    ["19,99", 19.99],
    [12, 12],
    ["", null],
    ["ask me", null],
    [null, null],
    [Infinity, null],
    [0, 0],
  ])("parses %s", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });

  it("converts through USD, which has no row of its own", () => {
    expect(convertPrice(100, "USD", "EUR", RATES)).toBeCloseTo(90);
    expect(convertPrice(90, "EUR", "USD", RATES)).toBeCloseTo(100);
    expect(convertPrice(90, "EUR", "GBP", RATES)).toBeCloseTo(80);
    expect(convertPrice(10, "eur", "EUR", {})).toBe(10);
    expect(convertPrice(10, "XYZ", "EUR", RATES)).toBeNull();
  });

  it("formats money for the locale, without .00 on whole amounts", () => {
    expect(formatMoney(49.99, "USD", en)).toBe("$49.99");
    expect(formatMoney(49, "USD", en)).toBe("$49");
    expect(formatMoney(1543.125, "GBP", en)).toBe("£1,543.13");
    expect(formatMoney(48.99, "EUR", { ...en, round: true })).toBe("€49");
    expect(formatMoney(100, "not money", en)).toBe("NOT MONEY 100");
    expect(formatMoney(12.345, "kr", en)).toBe("KR 12.35");
    expect(formatMoney(7234.56, "JPY", en)).toBe("¥7,235");
  });

  it("shows item prices in the display currency when it can", () => {
    const display = { ...en, currency: "EUR", rates: RATES };
    expect(formatPrice("100", "USD", display)).toBe("€90");
    expect(formatPrice("12.40", "EUR", display)).toBe("€12.40");
    // Intl separates an unknown code from the amount with a non-breaking space.
    expect(formatPrice("100", "XYZ", display)).toBe("XYZ 100");
    expect(formatPrice("100", "USD", { ...en, currency: "EUR" })).toBe("$100");
    expect(formatPrice("ask me", "USD", display)).toBe("");
    expect(formatPrice("48.99", "USD", { ...en, currency: "USD", round: true })).toBe("$49");
  });

  it("uses the requested locale for separators and symbol placement", () => {
    expect(formatMoney(1234.5, "EUR", { locale: "de-DE" })).toBe("1.234,50\u00a0€");
  });

  it("rounds after conversion and also when a missing rate keeps the original currency", () => {
    const display = { ...en, currency: "EUR", round: true };
    expect(formatPrice("50.49", "USD", { ...display, rates: RATES })).toBe("€45");
    expect(formatPrice("50.49", "USD", display)).toBe("$50");
  });
});
