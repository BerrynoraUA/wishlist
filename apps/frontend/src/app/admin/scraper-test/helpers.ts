import type { TestCase } from "./test-urls";
import type { FieldValidation, ProductData, ScraperStatus } from "./constants";

/**
 * Parse a loosely-formatted price string (various locales / separators) into
 * a comparable number. Returns null when the input cannot be parsed.
 */
export function parseComparablePrice(value: string | null): number | null {
  if (value === null) return null;

  const numericPart = value.replace(/[^\d.,\s]/g, "").trim();
  if (!numericPart) return null;

  const compactValue = numericPart.replace(/\s+/g, "");
  const lastCommaIndex = compactValue.lastIndexOf(",");
  const lastDotIndex = compactValue.lastIndexOf(".");

  let normalizedValue = compactValue;

  if (lastCommaIndex !== -1 && lastDotIndex !== -1) {
    if (lastCommaIndex > lastDotIndex) {
      normalizedValue = compactValue.replace(/\./g, "").replace(",", ".");
    } else {
      normalizedValue = compactValue.replace(/,/g, "");
    }
  } else if (lastCommaIndex !== -1) {
    const fractionalDigits = compactValue.length - lastCommaIndex - 1;
    normalizedValue =
      fractionalDigits > 0 && fractionalDigits <= 2
        ? compactValue.replace(",", ".")
        : compactValue.replace(/,/g, "");
  } else if (lastDotIndex !== -1) {
    const fractionalDigits = compactValue.length - lastDotIndex - 1;
    normalizedValue =
      fractionalDigits > 0 && fractionalDigits <= 2
        ? compactValue
        : compactValue.replace(/\./g, "");
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

/**
 * True if two price strings represent the same numeric amount (ignoring
 * locale/currency formatting), falling back to strict equality when either
 * side cannot be parsed.
 */
export function isPriceMatch(expected: string | null, actual: string | null): boolean {
  const expectedPrice = parseComparablePrice(expected);
  const actualPrice = parseComparablePrice(actual);

  if (expectedPrice === null || actualPrice === null) {
    return expected === actual;
  }

  return expectedPrice === actualPrice;
}

/**
 * Compare scraped product data against a test case's expected values and
 * produce a per-field validation report.
 */
export function validateResult(testCase: TestCase, data: ProductData | null): FieldValidation[] {
  const fields: {
    field: string;
    key: keyof TestCase["expected"];
    dataKey: keyof ProductData;
  }[] = [
    { field: "Title", key: "title", dataKey: "title" },
    { field: "Price", key: "price", dataKey: "price" },
    { field: "Image", key: "image", dataKey: "image" },
    { field: "Description", key: "description", dataKey: "description" },
  ];

  return fields.map(({ field, key, dataKey }) => {
    const expected = testCase.expected[key];
    const rawActual = data?.[dataKey];
    const actual = rawActual == null ? null : String(rawActual);

    if (expected === null) {
      return { field, expected, actual, match: null };
    }

    const trimmedExpected = expected?.trim() ?? null;
    const trimmedActual = actual?.trim() ?? null;

    let match: boolean;
    if (key === "price") {
      match = isPriceMatch(trimmedExpected, trimmedActual);
    } else if (key === "description" && trimmedExpected && trimmedActual) {
      match =
        trimmedActual === trimmedExpected ||
        trimmedActual.startsWith(trimmedExpected.replace(/…$/, "")) ||
        trimmedExpected.startsWith(trimmedActual.replace(/…$/, ""));
    } else {
      match = trimmedExpected === trimmedActual;
    }

    return { field, expected, actual, match };
  });
}

/**
 * Combine raw scraper status with per-field validation to produce the final
 * row status shown in the UI.
 */
export function computeStatus(
  scraperStatus: ScraperStatus,
  validations: FieldValidation[],
): ScraperStatus {
  if (scraperStatus === "failed") return "failed";

  const checked = validations.filter((v) => v.match !== null);
  if (checked.length === 0) return scraperStatus;
  const allMatch = checked.every((v) => v.match);
  if (allMatch) return "success";
  const someMatch = checked.some((v) => v.match);
  return someMatch ? "partial" : "failed";
}

/**
 * Extract just the hostname from a URL, or return the original string if it
 * cannot be parsed.
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
