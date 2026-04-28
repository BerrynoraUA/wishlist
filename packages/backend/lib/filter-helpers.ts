export function getMultiParamValues(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(new Set(searchParams.getAll(key).filter(Boolean)));
}

export function parsePage(searchParams: URLSearchParams, key = "page"): number {
  const raw = Number.parseInt(searchParams.get(key) ?? "1", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapFilterValues(values: string[], map: Record<string, number>): number[] {
  return values.map((value) => map[value]).filter((value) => value !== undefined);
}

export function toNumberArray(values: string[]): number[] {
  return values.map(Number).filter(Number.isFinite);
}

export function paginationFlags(page: number, itemsCount: number, pageSize: number) {
  return {
    hasNextPage: itemsCount === pageSize,
    hasPrevPage: page > 1,
    showPagination: itemsCount === pageSize || page > 1,
    totalForPagination: itemsCount === pageSize ? page + 1 : page,
  };
}

export function hasActiveFilters(
  search: string,
  multiValues: string[][],
  rangeValues: (number | null)[],
): boolean {
  if (search.trim() !== "") return true;
  if (multiValues.some((arr) => arr.length > 0)) return true;
  if (rangeValues.some((value) => value !== null)) return true;
  return false;
}
