/**
 * Shared helpers for filter/sort URL query params used across pages.
 */

/**
 * Extract all unique values for a given key from URLSearchParams.
 */
export function getMultiParamValues(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(new Set(searchParams.getAll(key).filter(Boolean)));
}

/**
 * Parse a numeric page from searchParams (min 1).
 */
export function parsePage(searchParams: URLSearchParams, key = "page"): number {
  const raw = Number.parseInt(searchParams.get(key) ?? "1", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

/**
 * Parse a debounced string value into a nullable number (for price filters).
 */
export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convert string filter values to an array of numbers via a lookup map.
 * Entries that don't exist in the map are silently dropped.
 */
export function mapFilterValues(values: string[], map: Record<string, number>): number[] {
  return values.map((v) => map[v]).filter((n) => n !== undefined);
}

/**
 * Convert string filter values to numbers directly (e.g. priority "3" → 3).
 */
export function toNumberArray(values: string[]): number[] {
  return values.map(Number).filter(Number.isFinite);
}

/**
 * Determine basic cursor-based pagination flags given current page and items received.
 */
export function paginationFlags(page: number, itemsCount: number, pageSize: number) {
  return {
    hasNextPage: itemsCount === pageSize,
    hasPrevPage: page > 1,
    showPagination: itemsCount === pageSize || page > 1,
    totalForPagination: itemsCount === pageSize ? page + 1 : page,
  };
}

/**
 * Check whether any filter is active (search, multi-value filters, range values).
 */
export function hasActiveFilters(
  search: string,
  multiValues: string[][],
  rangeValues: (number | null)[],
): boolean {
  if (search.trim() !== "") return true;
  if (multiValues.some((arr) => arr.length > 0)) return true;
  if (rangeValues.some((v) => v !== null)) return true;
  return false;
}
