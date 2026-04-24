import { FRIENDS_SEARCH_PARAM } from "./constants";

/**
 * Pure reader for the Friends page `search` query parameter.
 */
export function getFriendsSearch(searchParams: URLSearchParams): string {
  return searchParams.get(FRIENDS_SEARCH_PARAM) ?? "";
}

/**
 * Prompt the user to confirm removing a friend. Returns true when confirmed.
 * Uses window.confirm; safe only in the browser.
 */
export function confirmRemoveFriend(message: string): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}
