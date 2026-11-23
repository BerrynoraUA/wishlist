/**
 * Build the base URL used when creating a wishlist share link. Returns an
 * empty string when called in an SSR context where `window` is unavailable;
 * the share API will fall back to a server-side default in that case.
 */
export function getShareBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/share`;
}

export type ItemsView = "error" | "loading" | "items" | "no-matches" | "empty" | "past-last-page";

/**
 * The one state the items section renders. "past-last-page" is an empty page
 * past the end of an unfiltered list and renders nothing.
 */
export function getItemsView(state: {
  isError: boolean;
  isLoading: boolean;
  visibleCount: number;
  hasAnyItems: boolean;
  isFiltersActive: boolean;
}): ItemsView {
  if (state.isError) return "error";
  if (state.isLoading) return "loading";
  if (state.visibleCount > 0) return "items";
  if (state.isFiltersActive) return "no-matches";
  return state.hasAnyItems ? "past-last-page" : "empty";
}
