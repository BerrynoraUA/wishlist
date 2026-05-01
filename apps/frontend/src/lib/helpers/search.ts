export const MIN_SEARCH_QUERY_LENGTH = 3;

export function normalizeSearchQuery(query?: string | null, minLength = MIN_SEARCH_QUERY_LENGTH) {
  const trimmed = query?.trim() ?? "";

  return trimmed.length >= minLength ? trimmed : "";
}

export function hasReachedSearchThreshold(
  query?: string | null,
  minLength = MIN_SEARCH_QUERY_LENGTH,
) {
  return normalizeSearchQuery(query, minLength).length >= minLength;
}
